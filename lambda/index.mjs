import { DynamoDBClient, CreateTableCommand, DescribeTableCommand } from '@aws-sdk/client-dynamodb';
import {
  DynamoDBDocumentClient,
  ScanCommand,
  PutCommand,
  GetCommand,
  DeleteCommand,
  UpdateCommand,
} from '@aws-sdk/lib-dynamodb';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import {
  CognitoIdentityProviderClient,
  AdminCreateUserCommand,
  AdminAddUserToGroupCommand,
  AdminDeleteUserCommand,
} from '@aws-sdk/client-cognito-identity-provider';
import { randomUUID } from 'crypto';

const REGION = process.env.AWS_REGION || 'us-east-2';
const client = new DynamoDBClient({ region: REGION });
const ddb = DynamoDBDocumentClient.from(client);
const s3 = new S3Client({ region: REGION });
const cognito = new CognitoIdentityProviderClient({ region: REGION });

const S3_BUCKET = process.env.PROFILE_BUCKET || 'optutor-com';
const USER_POOL_ID = process.env.COGNITO_USER_POOL_ID || '';

const TABLES = {
  roles: 'OpTutor-Roles',
  userRoles: 'OpTutor-UserRoles',
  roleRequests: 'OpTutor-RoleRequests',
  courses: 'OpTutor-Courses',
  liveSessions: 'OpTutor-LiveSessions',
  students: 'optutor-students',
  employees: 'optutor-employees',
};

// Cache of tables we've ensured exist this container lifetime
const ensuredTables = new Set();

// Create a PAY_PER_REQUEST table on first use if it doesn't exist
async function ensureTable(tableName, pk) {
  if (ensuredTables.has(tableName)) return;
  try {
    await client.send(new DescribeTableCommand({ TableName: tableName }));
    ensuredTables.add(tableName);
    return;
  } catch (err) {
    if (err.name !== 'ResourceNotFoundException') throw err;
  }
  try {
    await client.send(new CreateTableCommand({
      TableName: tableName,
      AttributeDefinitions: [{ AttributeName: pk, AttributeType: 'S' }],
      KeySchema: [{ AttributeName: pk, KeyType: 'HASH' }],
      BillingMode: 'PAY_PER_REQUEST',
    }));
    // Best-effort wait for ACTIVE
    for (let i = 0; i < 20; i++) {
      try {
        const d = await client.send(new DescribeTableCommand({ TableName: tableName }));
        if (d.Table?.TableStatus === 'ACTIVE') break;
      } catch { /* not ready */ }
      await new Promise(r => setTimeout(r, 1000));
    }
    ensuredTables.add(tableName);
  } catch (err) {
    if (err.name === 'ResourceInUseException') { ensuredTables.add(tableName); return; }
    throw err;
  }
}

// Upload a base64 data URL to S3, returns the public URL (or '' on failure)
async function uploadProfilePicture(userId, dataUrl) {
  if (!dataUrl || !dataUrl.startsWith('data:')) return '';
  const m = dataUrl.match(/^data:([^;]+);base64,(.*)$/);
  if (!m) return '';
  const contentType = m[1] || 'image/jpeg';
  const buffer = Buffer.from(m[2], 'base64');
  const key = `profile-pictures/${userId}.jpg`;
  try {
    await s3.send(new PutObjectCommand({
      Bucket: S3_BUCKET,
      Key: key,
      Body: buffer,
      ContentType: contentType,
    }));
    return `https://${S3_BUCKET}.s3.${REGION}.amazonaws.com/${key}`;
  } catch (err) {
    console.error('S3 upload failed:', err);
    return '';
  }
}

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

// ÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂ YouTube URL parser ÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂ
function parseYouTubeUrl(url) {
  if (!url) return null;
  const patterns = [
    /youtube\.com\/watch\?v=([^&\n?#]+)/,
    /youtu\.be\/([^&\n?#]+)/,
    /youtube\.com\/embed\/([^&\n?#]+)/,
    /youtube\.com\/live\/([^&\n?#]+)/,
  ];
  for (const p of patterns) {
    const m = url.match(p);
    if (m) return { providerVideoId: m[1], embedUrl: `https://www.youtube.com/embed/${m[1]}` };
  }
  return null;
}

// ÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂ Get caller email + permissions ÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂ
async function getCallerContext(event) {
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

// ÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂ Normalize video object (handles old + new shapes) ÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂ
function normalizeVideo(v, index) {
  const ytUrl = v.youtubeUrl || '';
  const parsed = parseYouTubeUrl(ytUrl);
  return {
    videoId: v.videoId || randomUUID(),
    title: v.title || `Video ${index + 1}`,
    description: v.description || '',
    providerType: v.providerType || 'YOUTUBE',
    providerVideoId: v.providerVideoId || parsed?.providerVideoId || '',
    embedUrl: v.embedUrl || parsed?.embedUrl || '',
    youtubeUrl: ytUrl,
    order: v.order ?? index,
    // legacy compat
    source: v.source || 'youtube',
  };
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
    // Ã¢ÂÂÃ¢ÂÂ Roles Ã¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂ
    if (resource === 'roles') {
      if (method === 'GET' && !id) return ok((await scanAll(TABLES.roles)).map(normalizeRole));
      const ctx = await getCallerContext(event);
      if (!ctx.email) return unauthorized();
      if (!ctx.permissions.has('manage_roles')) return forbidden();

      if (method === 'POST' && !id) {
        const name = body.roleName || body.name;
        if (!name) return badRequest('roleName is required');
        const now = new Date().toISOString();
        const item = {
          roleId: body.roleId || randomUUID(),
          name,
          description: body.description || '',
          permissions: Array.isArray(body.permissions) ? body.permissions : [],
          isSystem: !!(body.isSystemRole || body.isSystem),
          createdBy: ctx.email,
          createdAt: now,
        };
        await ddb.send(new PutCommand({ TableName: TABLES.roles, Item: item }));
        return created(normalizeRole(item));
      }

      if (method === 'PUT' && id) {
        const existing = await ddb.send(new GetCommand({ TableName: TABLES.roles, Key: { roleId: id } }));
        if (!existing.Item) return notFound('Role not found');
        const patch = { ...body };
        if (patch.roleName) { patch.name = patch.roleName; delete patch.roleName; }
        if (typeof patch.isSystemRole !== 'undefined') { patch.isSystem = !!patch.isSystemRole; delete patch.isSystemRole; }
        const updated = { ...existing.Item, ...patch, roleId: id, updatedBy: ctx.email, updatedAt: new Date().toISOString() };
        await ddb.send(new PutCommand({ TableName: TABLES.roles, Item: updated }));
        return ok(normalizeRole(updated));
      }

      if (method === 'DELETE' && id) {
        const existing = await ddb.send(new GetCommand({ TableName: TABLES.roles, Key: { roleId: id } }));
        if (!existing.Item) return notFound('Role not found');
        if (existing.Item.isSystem) return forbidden('System roles cannot be deleted');
        await ddb.send(new DeleteCommand({ TableName: TABLES.roles, Key: { roleId: id } }));
        return ok({ deleted: true, roleId: id });
      }
    }
    // ÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂ Users ÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂ
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

    // ÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂ Role Requests ÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂ
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

    // ÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂ Courses ÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂ
    if (resource === 'courses') {
      if (method === 'GET' && !id) {
        const ctx = await getCallerContext(event);
        const all = await scanAll(TABLES.courses);
        const canManage = ctx.permissions.has('manage_courses');
        // Support both PUBLISHED (new) and published (legacy)
        const filtered = canManage ? all : all.filter(c => {
          const s = (c.status || '').toUpperCase();
          return s === 'PUBLISHED';
        });
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
        const { title, thumbnailUrl, shortDescription, description, category, tags, difficultyLevel, instructorName, videos, status, isPaid } = body;
        if (!title) return badRequest('title is required');
        if (!videos || !Array.isArray(videos) || videos.length === 0) return badRequest('At least one video is required');
        const now = new Date().toISOString();
        const normalizedStatus = (status || 'DRAFT').toUpperCase();
        const item = {
          courseId: randomUUID(),
          title,
          thumbnailUrl: thumbnailUrl || '',
          shortDescription: shortDescription || '',
          description: description || '',
          category: category || 'Other',
          tags: Array.isArray(tags) ? tags : [],
          difficultyLevel: difficultyLevel || 'BEGINNER',
          instructorName: instructorName || ctx.email,
          isPaid: !!isPaid,
          videos: videos.map((v, i) => normalizeVideo(v, i)),
          status: normalizedStatus,
          createdBy: ctx.email,
          createdAt: now,
          updatedBy: ctx.email,
          updatedAt: now,
          ...(normalizedStatus === 'PUBLISHED' ? { publishedAt: now } : {}),
        };
        await ddb.send(new PutCommand({ TableName: TABLES.courses, Item: item }));
        return created(item);
      }

      if (method === 'PUT' && id) {
        const existing = await ddb.send(new GetCommand({ TableName: TABLES.courses, Key: { courseId: id } }));
        if (!existing.Item) return notFound('Course not found');
        const now = new Date().toISOString();
        const incomingStatus = body.status ? (body.status).toUpperCase() : undefined;
        const wasPublished = (existing.Item.status || '').toUpperCase() === 'PUBLISHED';
        const willPublish = incomingStatus === 'PUBLISHED';
        const updated = {
          ...existing.Item,
          ...body,
          courseId: id,
          updatedBy: ctx.email,
          updatedAt: now,
          ...(incomingStatus ? { status: incomingStatus } : {}),
          ...(typeof body.isPaid !== 'undefined' ? { isPaid: !!body.isPaid } : {}),
          ...(!wasPublished && willPublish ? { publishedAt: now } : {}),
        };
        if (Array.isArray(updated.videos)) {
          updated.videos = updated.videos.map((v, i) => normalizeVideo(v, i));
        }
        if (Array.isArray(updated.tags)) {
          updated.tags = updated.tags;
        }
        await ddb.send(new PutCommand({ TableName: TABLES.courses, Item: updated }));
        return ok(updated);
      }

      if (method === 'DELETE' && id) {
        await ddb.send(new DeleteCommand({ TableName: TABLES.courses, Key: { courseId: id } }));
        return ok({ deleted: true, courseId: id });
      }
    }

    // ÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂ Live Sessions ÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂ
    if (resource === 'live-sessions') {
      if (method === 'GET' && !id) {
        const all = await scanAll(TABLES.liveSessions);
        // Support both LIVE (new) and live (legacy)
        const statusOrder = { LIVE: 0, live: 0, UPCOMING: 1, upcoming: 1, COMPLETED: 2, ended: 2, CANCELLED: 3, cancelled: 3 };
        return ok(all.sort((a, b) => {
          const od = (statusOrder[a.status] ?? 1) - (statusOrder[b.status] ?? 1);
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
        const { title, thumbnailUrl, shortDescription, description, instructorName, youtubeUrl, scheduledAt, duration, timezone, status, providerType, providerVideoId, embedUrl, isPaid } = body;
        if (!title) return badRequest('title is required');
        if (!youtubeUrl) return badRequest('youtubeUrl is required');
        if (!scheduledAt) return badRequest('scheduledAt is required');
        const parsed = parseYouTubeUrl(youtubeUrl);
        const now = new Date().toISOString();
        const item = {
          sessionId: randomUUID(),
          title,
          thumbnailUrl: thumbnailUrl || '',
          shortDescription: shortDescription || '',
          description: description || '',
          instructorName: instructorName || ctx.email,
          youtubeUrl,
          scheduledAt,
          duration: Number(duration) || 60,
          timezone: timezone || 'UTC',
          status: (status || 'UPCOMING').toUpperCase(),
          isPaid: !!isPaid,
          providerType: providerType || 'YOUTUBE',
          providerVideoId: providerVideoId || parsed?.providerVideoId || '',
          embedUrl: embedUrl || parsed?.embedUrl || '',
          createdBy: ctx.email,
          createdAt: now,
          updatedBy: ctx.email,
          updatedAt: now,
          // legacy compat
          hostName: instructorName || ctx.email,
        };
        await ddb.send(new PutCommand({ TableName: TABLES.liveSessions, Item: item }));
        return created(item);
      }

      if (method === 'PUT' && id) {
        const existing = await ddb.send(new GetCommand({ TableName: TABLES.liveSessions, Key: { sessionId: id } }));
        if (!existing.Item) return notFound('Session not found');
        const now = new Date().toISOString();
        const parsed = body.youtubeUrl ? parseYouTubeUrl(body.youtubeUrl) : null;
        const updated = {
          ...existing.Item,
          ...body,
          sessionId: id,
          updatedBy: ctx.email,
          updatedAt: now,
          ...(body.status ? { status: body.status.toUpperCase() } : {}),
          ...(typeof body.isPaid !== 'undefined' ? { isPaid: !!body.isPaid } : {}),
          ...(parsed ? { providerVideoId: parsed.providerVideoId, embedUrl: parsed.embedUrl } : {}),
          // keep legacy hostName in sync
          ...(body.instructorName ? { hostName: body.instructorName } : {}),
        };
        await ddb.send(new PutCommand({ TableName: TABLES.liveSessions, Item: updated }));
        return ok(updated);
      }

      if (method === 'DELETE' && id) {
        await ddb.send(new DeleteCommand({ TableName: TABLES.liveSessions, Key: { sessionId: id } }));
        return ok({ deleted: true, sessionId: id });
      }
    }


    // ÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂ Students (self-service signup profiles) ÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂ
    if (resource === 'students') {
      // Public self-registration: store profile after Cognito verification
      if (method === 'POST' && !id) {
        await ensureTable(TABLES.students, 'userId');
        const { userId, email, fullName, phone, dateOfBirth, profilePictureDataUrl,
                paymentMethodAdded, cardLastFour, cardHolderName, cardExpiry } = body;
        if (!userId || !email) return badRequest('userId and email are required');
        const now = new Date().toISOString();
        let profilePictureUrl = '';
        if (profilePictureDataUrl) {
          profilePictureUrl = await uploadProfilePicture(userId, profilePictureDataUrl);
        }
        const item = {
          userId,
          email,
          fullName: fullName || '',
          phone: phone || '',
          dateOfBirth: dateOfBirth || '',
          profilePictureUrl,
          paymentMethodAdded: !!paymentMethodAdded,
          cardLastFour: (cardLastFour || '').slice(-4),
          cardHolderName: cardHolderName || '',
          cardExpiry: cardExpiry || '',
          enrolledCourses: [],
          totalTimeSpentSeconds: 0,
          createdAt: now,
          lastActiveAt: now,
        };
        await ddb.send(new PutCommand({ TableName: TABLES.students, Item: item }));
        return created(item);
      }

      // Authenticated reads
      const ctx = await getCallerContext(event);
      if (!ctx.email) return unauthorized();

      if (method === 'GET' && !id) {
        if (!ctx.permissions.has('manage_users')) return forbidden();
        await ensureTable(TABLES.students, 'userId');
        return ok(await scanAll(TABLES.students));
      }

      if (method === 'GET' && id) {
        await ensureTable(TABLES.students, 'userId');
        const res = await ddb.send(new GetCommand({ TableName: TABLES.students, Key: { userId: id } }));
        if (!res.Item) return notFound('Student not found');
        return ok(res.Item);
      }
    }


      // ── GET /admin/users – list ALL Cognito users with groups ────────────
      if (method === 'GET' && path === '/admin/users') {
        const { CognitoIdentityProviderClient, ListUsersCommand, AdminListGroupsForUserCommand } = await import("@aws-sdk/client-cognito-identity-provider");
        const cognitoClient = new CognitoIdentityProviderClient({});
        const userPoolId = process.env.COGNITO_USER_POOL_ID;
        const listResult = await cognitoClient.send(new ListUsersCommand({ UserPoolId: userPoolId }));
        const users = await Promise.all(listResult.Users.map(async (u) => {
          const groupsResult = await cognitoClient.send(new AdminListGroupsForUserCommand({
            UserPoolId: userPoolId,
            Username: u.Username
          }));
          const attrs = {};
          u.Attributes.forEach(a => { attrs[a.Name] = a.Value; });
          return {
            userId: u.Username,
            email: attrs.email || u.Username,
            name: attrs.name || attrs['custom:name'] || attrs.email || u.Username,
            groups: groupsResult.Groups.map(g => g.GroupName),
            createdAt: u.UserCreateDate
          };
        }));
        return ok({ users });
      }

      // ── PUT /admin/users/{userId}/role – reassign Cognito group ──────────
      const putAdminUserRoleMatch = method === 'PUT' && path.match(/^\/admin\/users\/([^/]+)\/role$/);
      if (putAdminUserRoleMatch) {
        const { CognitoIdentityProviderClient, AdminListGroupsForUserCommand, AdminRemoveUserFromGroupCommand, AdminAddUserToGroupCommand } = await import("@aws-sdk/client-cognito-identity-provider");
        const cognitoClient = new CognitoIdentityProviderClient({});
        const userPoolId = process.env.COGNITO_USER_POOL_ID;
        const targetUserId = decodeURIComponent(putAdminUserRoleMatch[1]);
        const { role } = JSON.parse(body);
        const groupsResult = await cognitoClient.send(new AdminListGroupsForUserCommand({
          UserPoolId: userPoolId,
          Username: targetUserId
        }));
        await Promise.all(groupsResult.Groups.map(g =>
          cognitoClient.send(new AdminRemoveUserFromGroupCommand({
            UserPoolId: userPoolId,
            Username: targetUserId,
            GroupName: g.GroupName
          }))
        ));
        await cognitoClient.send(new AdminAddUserToGroupCommand({
          UserPoolId: userPoolId,
          Username: targetUserId,
          GroupName: role
        }));
        return ok({ success: true });
      }

    return notFound('Unknown resource: ' + resource);
  } catch (err) {
    console.error('Handler error:', err);
    return serverErr(err.message);
  }
}
