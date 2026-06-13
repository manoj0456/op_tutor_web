import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand } from '@aws-sdk/lib-dynamodb';

const client = new DynamoDBClient({ region: process.env.AWS_REGION || 'us-east-2' });
const ddb    = DynamoDBDocumentClient.from(client);

const roles = [
  {
    roleId: 'SUPER_ADMIN', name: 'Super Admin',
    description: 'Full platform access — can manage roles, users, and all content',
    permissions: ['manage_roles', 'promote_admins', 'manage_courses', 'view_content', 'manage_users'],
    isSystem: true, createdBy: 'system', createdAt: '2024-01-01T00:00:00.000Z',
  },
  {
    roleId: 'TEACHER', name: 'Teacher',
    description: 'Can create and manage courses, run live sessions',
    permissions: ['manage_courses', 'view_content'],
    isSystem: true, createdBy: 'system', createdAt: '2024-01-01T00:00:00.000Z',
  },
  {
    roleId: 'STUDENT', name: 'Student',
    description: 'Can browse and enroll in courses, join live sessions',
    permissions: ['view_content'],
    isSystem: true, createdBy: 'system', createdAt: '2024-01-01T00:00:00.000Z',
  },
];

for (const role of roles) {
  await ddb.send(new PutCommand({ TableName: 'OpTutor-Roles', Item: role }));
  console.log('Seeded role:', role.roleId);
}
console.log('Seed complete.');