import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import {
  DynamoDBDocumentClient,
  ScanCommand,
  PutCommand,
  GetCommand,
  DeleteCommand,
} from '@aws-sdk/lib-dynamodb';
import { randomUUID } from 'crypto';

const client = new DynamoDBClient({ region: process.env.AWS_REGION || 'us-east-2' });
const ddb = DynamoDBDocumentClient.from(client);

const TABLES = {
  roles: 'OpTutor-Roles',
  userRoles: 'OpTutor-UserRoles',
  roleRequests: 'OpTutor-RoleRequests',
  courses: 'OpTutor-Courses',
  liveSessions: 'OpTutor-LiveSessions',
};

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type,Authorization',
  'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
};

const json = (s, b) => ({ statusCode: s, headers: { ...CORS, 'Content-Type': 'application/json' }, body: JSON.stringify(b) });
const ok = (b) => json(200, b);
const created = (b) => json(201, b);
const notFound = (m) => json(404, { error: m || 'Not found' });
const serverErr = (m) => json(500, { error: m });
const forbidden = (m) => json(403, { error: m || 'Insufficient permissions' });
const badRequest = (m) => json(400, { error: m || 'Bad request' });
const unauthorized = () => json(401, { error: 'Unauthorized' });

async function scanAll(table) {
  const items = [];
  let lastKey;
  do {
    const res = await ddb.send(new ScanCommand({ TableName: table, ExclusiveStartKey: lastKey }));
    items.push(...(res.Items || []));
    lastKey = res.LastEvaluatedKey;
  } while (lastKey);
  return items;
}

function parseBody(event) {
  if (!event.body) return {};
  try { return typeof event.body === 'string' ? JSON.parse(event.body) : event.body; }
  catch { return {}; }
}

function normalizeRole(role) {
  if (!role) return role;
  const p = role.permissions;
  return { ...role, permissions: p instanceof Set ? Array.from(p) : (Array.isArray(p) ? p : []) };
}

function extractEmail(event) {
  const auth = event.headers?.Authorization || event.headers?.authorization || '';
  const token = auth.replace(/^Bearer\s+/i, '');
  if (!token) return null;
  const parts = token.split('.');
  if (parts.length < 2) return null;
  try {
    const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8'));
    return payload.email || payload['cognito:username'] || null;
  } catch { return null; }
}

as function getCallerContext(event) {
  const email = extractEmail(event);
  if (!email) return { email: null, roleRecord: null, permissions: new Set() };
  try {
    const urRes = await ddb.send(new GetCommand({ TableName: TABLES.userRoles, Key: { userEmail: email } }));
    if (!urRes.Item) return { email, roleRecord: null, permissions: new Set() };
    const rRes = await ddb.send(new GetCommand({ TableName: TABLES.roles, Key: { roleId: urRes.Item.roleId } }));
    if (!rRes.Item) return { email, roleRecord: null, permissions: new Set() };
    const perms = rRes.Item.permissions instanceof Set
      ? rRes.Item.permissions
      : new Set(rRes.Item.permissions || []);
    return { email, roleRecord: rRes.Item, permissions: perms };
  } catch (err) {
    console.error('getCallerContext error:', err);
    return { email, roleRecord: null, permissions: new Set() };
  }
}

export async function handler(event) {
  const method = event.httpMethod;
  const path = event.path || '/';

  if (method === 'OPTIONS') return { statusCode: 200, headers: CORS, body: '' };

  const cleanPath = path.replace(/^\/prod/, '');
  const parts = cleanPath.replace(/^\//, '').split('/');
  const resource = parts[0];
  const id = parts[1];
  const action = parts[2];
  const body = parseBody(event);

  try {
    // Roles
    if (resource === 'roles') {
      if (method === 'GET' && !id) return ok((await scanAll(TABLES.roles)).map(normalizeRole));
      const ctx = await getCallerContext(event);
      if (!ctx.email) return unauthorized();
      if (method === 'PUT' && id) {
        if (!ctx.permissions.has('manage_roles')) return forbidden();
        const existing = await ddb.send(new GetCommand({ TableName: TABLES.roles, Key: { roleId: id } }));
        if (!existing.Item) return notFound('Role not found');
        const updated = { ...existing.Item, ...body, roleId: id };
        await ddb.send(new PutCommand({ TableName: TABLES.roles, Item: updated }));
        return ok(normalizeRole(updated));
      }
    }

    // Users
    if (resource === 'users') {
      const ctx = await getCallerContext(event);
      if (!ctx.email) return unauthorized();

      if (method === 'GET' && id === 'me') {
        const urRes = await ddb.send(new GetCommand({ TableName: TABLES.userRoles, Key: { userEmail: ctx.email } }));
        if (!urRes.Item) return ok({ email: ctx.email, roleId: 'STUDENT', roleName: 'Student', permissions: ['view_content'] });
        const rRes = await ddb.send(new GetCommand({ TableName: TABLES.roles, Key: { roleId: urRes.Item.roleId } }));
        const perms = rRes.Item?.permissions instanceof Set
          ? Array.from(rRes.Item.permissions)
          : (rRes.Item?.permissions || []);
        return ok({ email: ctx.email, roleId: urRes.Item.roleId, roleName: urRes.Item.roleName, permissions: perms });
      }

      if (method === 'PUT' && id && action === 'role') {
        if (!ctx.permissions.has('manage_roles')) return forbidden();
        const email = decodeURIComponent(id);
        const { roleId } = body;
        if (!roleId) return badRequest('roleId is required');
        const rRes = await ddb.send(new GetCommand({ TableName: TABLES.roles, Key: { roleId } }));
        if (!rRes.Item) return notFound('Role not found');
        if (roleId === 'SUPER_ADMIN' && !ctx.permissions.has('promote_admins')) return forbidden('Only super admins can assign the SUPER_ADMIN role');
        const existing = await ddb.send(new GetCommand({ TableName: TABLES.userRoles, Key: { userEmail: email } }));
        const item = {
          ...(existing.Item || { userEmail: email }),
          roleId: rRes.Item.roleId, roleName: rRes.Item.name,
          assignedBy: ctx.email, assignedAt: new Date().toISOString(),
        };
        await ddb.send(new PutCommand({ TableName: TABLES.userRoles, Item: item }));
        return ok(item);
      }

      if (method === 'GET' && !id) {
        if (!ctx.permissions.has('manage_roles')) return forbidden();
        const userRoles = await scanAll(TABLES.userRoles);
        return ok(userRoles.map(ur => ({
          email: ur.userEmail, name: ur.name || ur.userEmail,
          roleId: ur.roleId, roleName: ur.roleName,
          assignedBy: ur.assignedBy, assignedAt: ur.assignedAt,
        })));
      }
    }

    // Role Requests
    if (resource === 'role-requests') {
      if (method === 'POST') {
        const { email, name, requestedRole } = body;
        if (!email) return badRequest('email is required');
        const item = {
          requestId: randomUUID(), email, name: name || email,
          requestedRole: requestedRole || 'STUDENT',
          status: 'pending', createdAt: new Date().toISOString(),
        };
        await ddb.send(new PutCommand({ TableName: TABLES.roleRequests, Item: item }));
        return created(item);
      }
      const ctx = await getCallerContext(event);
      if (!ctx.email) return unauthorized();
      if (!ctx.permissions.has('manage_roles')) return forbidden();
      if (method === 'GET') return ok(await scanAll(TABLES.roleRequests));
    }

    // Courses
    if (resource === 'courses') {
      if (method === 'GET' && !id) {
        const ctx = await getCallerContext(event);
        const all = await scanAll(TABLES.courses);
        const canManage = ctx.permissions.has('manage_courses');
        const filtered = canManage ? all : all.filter(c => c.status === 'published');
        return ok(filtered.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)));
      }

      if (method === 'GET' && id) {
        const res = await ddb.send(new GetCommand({ TableName: TABLES.courses, Key: { courseId: id } }));
        if (!res.Item) return notFound('Course not found');
        return ok(res.Item);
      }

      const ctx = await getCallerContext(event);
      if (!ctx.email) return unauthorized();
      if (!ctx.permissions.has('manage_courses')) return forbidden();

      if (method === 'POST') {
        const { title, description, category, videos, status } = body;
        if (!title) return badRequest('title is required');
        if (!videos || !Array.isArray(videos) || videos.length === 0) return badRequest('At least one video is required');
        const now = new Date().toISOString();
        const item = {
          courseId: randomUUID(),
          title,
          description: description || '',
          category: category || 'other',
          videos: videos.map(v => ({
            videoId: randomUUID(),
            title: v.title || 'Untitled Video',
            youtubeUrl: v.youtubeUrl || '',
            source: v.source || 'youtube',
          })),
          status: status || 'published',
          createdBy: ctx.email,
          createdAt: now,
          updatedAt: now,
        };
        await ddb.send(new PutCommand({ TableName: TABLES.courses, Item: item }));
        return created(item);
      }

      if (method === 'PUT' && id) {
        const existing = await ddb.send(new GetCommand({ TableName: TABLES.courses, Key: { courseId: id } }));
        if (!existing.Item) return notFound('Course not found');
        const updated = { ...existing.Item, ...body, courseId: id, updatedAt: new Date().toISOString() };
        if (Array.isArray(updated.videos)) {
          updated.videos = updated.videos.map(v => ({
            ...v,
            videoId: v.videoId || randomUUID(),
            source: v.source || 'youtube',
          }));
        }
        await ddb.send(new PutCommand({ TableName: TABLES.courses, Item: updated }));
        return ok(updated);
      }

      if (method === 'DELETE' && id) {
        await ddb.send(new DeleteCommand({ TableName: TABLES.courses, Key: { courseId: id } }));
        return ok({ deleted: true, courseId: id });
      }
    }

    // Live Sessions
    if (resource === 'live-sessions') {
      if (method === 'GET' && !id) {
        const all = await scanAll(TABLES.liveSessions);
        const order = { live: 0, upcoming: 1, ended: 2 };
        return ok(all.sort((a, b) => {
          const od = (order[a.status] ?? 1) - (order[b.status] ?? 1);
          if (od !== 0) return od;
          return new Date(a.scheduledAt) - new Date(b.scheduledAt);
        }));
      }

      if (method === 'GET' && id) {
        const res = await ddb.send(new GetCommand({ TableName: TABLES.liveSessions, Key: { sessionId: id } }));
        if (!res.Item) return notFound('Session not found');
        return ok(res.Item);
      }

      const ctx = await getCallerContext(event);
      if (!ctx.email) return unauthorized();
      if (!ctx.permissions.has('manage_courses')) return forbidden();

      if (method === 'POST') {
        const { title, description, youtubeUrl, scheduledAt, duration, hostName, status } = body;
        if (!title) return badRequest('title is required');
        if (!youtubeUrl) return badRequest('youtubeUrl is required');
        if (!scheduledAt) return badRequest('scheduledAt is required');
        const now = new Date().toISOString();
        const item = {
          sessionId: randomUUID(),
          title,
          description: description || '',
          youtubeUrl,
          scheduledAt,
          duration: Number(duration) || 60,
          hostName: hostName || ctx.email,
          status: status || 'upcoming',
          createdBy: ctx.email,
          createdAt: now,
        };
        await ddb.send(new PutCommand({ TableName: TABLES.liveSessions, Item: item }));
        return created(item);
      }

      if (method === 'PUT' && id) {
        const existing = await ddb.send(new GetCommand({ TableName: TABLES.liveSessions, Key: { sessionId: id } }));
        if (!existing.Item) return notFound('Session not found');
        const updated = { ...existing.Item, ...body, sessionId: id };
        await ddb.send(new PutCommand({ TableName: TABLES.liveSessions, Item: updated }));
        return ok(updated);
      }

      if (method === 'DELETE' && id) {
        await ddb.send(new DeleteCommand({ TableName: TABLES.liveSessions, Key: { sessionId: id } }));
        return ok({ deleted: true, sessionId: id });
      }
    }

    return notFound('Unknown resource: ' + resource);
  } catch (err) {
    console.error('Handler error:', err);
    return serverErr(err.message);
  }
}
