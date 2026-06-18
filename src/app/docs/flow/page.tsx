'use client'
import { useEffect, useState } from 'react'

/* ─── Mermaid diagram strings ─────────────────────────────────────────────── */

const AUTH_DIAGRAM = `flowchart TD
    V["Visitor / Unauthenticated"] --> HOME["Home (/)\\nPublic marketing page"]
    HOME -->|Sign In link| LOGIN["/login\\nLoginForm rendered"]

    LOGIN --> CREDS["Enter email + password"]
    CREDS -->|submit| COGN["Cognito authenticateUser()"]
    COGN -->|"onFailure — wrong creds"| TERR["toast.error shown"]
    TERR --> CREDS
    COGN -->|"newPasswordRequired"| NPC["⚠️ FORCE_CHANGE_PASSWORD challenge\\n(first login with admin-set temp password)"]
    NPC --> NPF["Set New Password form\\nnew password + confirm"]
    NPF -->|submit| CPN["completeNewPasswordChallenge()"]
    CPN -->|"onFailure"| NPTERR["Error toast"]
    NPTERR --> NPF
    CPN -->|"onSuccess"| SETU["setUser(cognitoUser)\\nsetUserEmail(email from token)"]
    SETU --> RDR["Redirect to /"]
    COGN -->|"onSuccess"| SETU

    LOGIN -->|"Forgot password?"| FPV["Forgot Password view"]
    FPV --> FPE["Enter email address"]
    FPE -->|submit| FPCALL["forgotPassword()\\nCognito sends 6-digit code via email"]
    FPCALL --> FPR["Enter code + new password"]
    FPR -->|submit| CFP["confirmForgotPassword()"]
    CFP -->|success| LOGIN
    CFP -->|failure| FPERR["Error toast"]
    FPERR --> FPR

    subgraph RESTORE ["Session Restore on App Load"]
        APPLOAD["AuthProvider useEffect mounts"] --> CUSR["userPool.getCurrentUser()"]
        CUSR -->|"user object found"| GSESS["getSession()"]
        GSESS -->|"valid & not expired"| AUTHU["setUser + setUserEmail\\nauto sign-in restored"]
        GSESS -->|"expired or error"| UNAUTH["setUser = null"]
        CUSR -->|"no user in localStorage"| UNAUTH
    end

    AUTH["Authenticated user"] -->|"Logout button"| SO["signOut()\\nCognito + clear local pool"]
    SO --> LOGOUTREDIR["router.push('/login')"]`

const PERM_DIAGRAM = `flowchart TD
    START["User authenticated\\n(AuthContext has user + token)"] --> TK["getIdToken() — fetch JWT"]
    TK --> DEC["Decode JWT payload\\n(base64url → JSON)"]
    DEC --> GRPCHK{"cognito:groups\\nin payload?"}
    GRPCHK -->|"yes (non-empty array)"| PG["primaryGroup = groups[0]\\ne.g. SUPER_ADMIN, ADMIN, TEACHER, STUDENT"]
    GRPCHK -->|"no groups"| PNG["primaryGroup = null"]

    PG --> ME["GET /users/me\\nAuthorization: Bearer token"]
    PNG --> ME
    ME -->|"200 OK"| RID["Use roleId + roleName\\nfrom DynamoDB UserRoles table"]
    ME -->|"not found → default"| DEF["roleId = primaryGroup OR 'STUDENT'"]

    RID --> CR["GET /roles\\nFetch all custom roles from DynamoDB"]
    DEF --> CR

    CR --> MATCH{"primaryGroup non-null AND\\nmatches a custom role name?\\n(case-insensitive)"}
    MATCH -->|"yes — custom role found"| CP["Use custom role's permissions array\\n(overrides all defaults)"]
    MATCH -->|"no match or no primaryGroup"| HD["Use hardcoded defaults by roleId"]

    HD --> SA{"roleId = SUPER_ADMIN?"}
    SA -->|yes| ALL["ALL 8 permissions:\\nview_courses, view_live, view_content\\nmanage_courses, manage_roles\\nmanage_employees, manage_students\\npromote_admins"]
    SA -->|no| AD{"roleId = ADMIN?"}
    AD -->|yes| APERMS["7 permissions (all except view_content):\\nview_courses, view_live\\nmanage_courses, manage_roles\\nmanage_employees, manage_students\\npromote_admins"]
    AD -->|no| TC{"roleId = TEACHER?"}
    TC -->|yes| TPERMS["3 permissions:\\nview_courses\\nview_live\\nmanage_courses"]
    TC -->|no| STPERMS["3 permissions (default/STUDENT):\\nview_content\\nview_courses\\nview_live"]

    CP --> DONE["Set permissions as Set<string>\\nin PermissionContext"]
    ALL --> DONE
    APERMS --> DONE
    TPERMS --> DONE
    STPERMS --> DONE

    DONE --> HAP["hasPermission(key) function\\navailable app-wide via usePermissions()"]`

const EMPLOYEE_DIAGRAM = `sequenceDiagram
    actor Admin as Admin/Super Admin
    participant UI as Roles Page (Employees Tab)
    participant Lambda as Lambda (optutor-api)
    participant DDB as DynamoDB (optutor-employees)
    participant Cognito as AWS Cognito

    Admin->>UI: Click "Add Employee"\\nFill form: name, email, role, dept, phone
    UI->>Lambda: POST /employees\\n{email, fullName, role, department, phone, hireDate}
    Lambda->>Lambda: generateSecurePassword()\\n12-char: upper+lower+digits+special
    Lambda->>Cognito: AdminCreateUser()\\n{email, tempPassword, MessageAction: SUPPRESS}
    Cognito-->>Lambda: user created
    Lambda->>Cognito: AdminAddUserToGroup()\\n{group: role}
    Lambda->>DDB: PutCommand()\\n{userId, email, fullName, role, department,\\nphone, hireDate, status: active, createdAt}
    Lambda-->>UI: 201 Created\\n{...employee, tempPassword}
    UI-->>Admin: Show temp password modal\\n"Share this with the employee"

    Note over Admin,Cognito: Employee First Login
    actor Emp as New Employee
    Emp->>UI: Navigate to /login\\nEnter email + temp password
    UI->>Cognito: authenticateUser()
    Cognito-->>UI: newPasswordRequired challenge
    UI-->>Emp: Show "Set New Password" form
    Emp->>UI: Enter new password + confirm
    UI->>Cognito: completeNewPasswordChallenge()
    Cognito-->>UI: Session token (with Cognito group)
    UI->>Lambda: GET /users/me (loads role from UserRoles)
    Lambda-->>UI: roleId + permissions
    UI-->>Emp: Redirect to / (full access per role)

    Note over Admin,DDB: Edit Employee (ADMIN+)
    Admin->>UI: Click Edit on employee row
    UI->>Lambda: PUT /employees/{email}\\n{fullName, role, department, phone, status}
    Lambda->>DDB: UpdateCommand()
    Lambda-->>UI: 200 OK updated record

    Note over Admin,Cognito: Delete Employee (SUPER_ADMIN only)
    Admin->>UI: Click Delete
    UI->>Lambda: DELETE /employees/{email}
    Lambda->>Cognito: AdminDeleteUser()
    Lambda->>DDB: DeleteCommand()
    Lambda-->>UI: 200 OK {deleted: true}

    Note over Admin,Cognito: Reset Password (SUPER_ADMIN only)
    Admin->>UI: Click Reset Password
    UI->>Lambda: POST /employees/{email}/reset-password
    Lambda->>Lambda: generateSecurePassword()
    Lambda->>Cognito: AdminSetUserPassword()\\n{permanent: false → triggers new challenge}
    Lambda-->>UI: {tempPassword}
    UI-->>Admin: Show new temp password`

const STUDENT_DIAGRAM = `flowchart TD
    subgraph SELF ["Path A — Student Self-Registration (via /signup)"]
        SV["Student visits /signup"] --> SF["Fill form: name, email, password"]
        SF --> CU["Cognito signUp()\\nCreates user in Cognito USER POOL"]
        CU --> CC["Cognito sends verification email with code"]
        CC --> CV["Student enters 6-digit code"]
        CV --> CSU["confirmSignUp()\\nUser email verified in Cognito"]
        CSU --> SL["Student logs in at /login"]
        SL --> SPERM["JWT has no cognito:groups\\nprimaryGroup = null\\nroleId defaults to 'STUDENT'"]
        SPERM --> SACCESS["Can access: Courses (free), Live (free)"]
        SACCESS --> GAP1["⚠️ GAP: Self-registered students\\nNOT added to UserRoles table\\nPermissions from hardcoded STUDENT defaults"]
    end

    subgraph ADMIN_ADD ["Path B — Admin Adds Student via Roles Page"]
        A["Admin opens Roles Page\\nStudents Tab"] --> B["Click Add Student"]
        B --> C["Fill form: name, email, phone"]
        C --> D["POST /students\\n{email, name, phone, createdAt}"]
        D --> E["DynamoDB optutor-students record created"]
        E --> GAP2["⚠️ GAP: Student NOT created in Cognito\\nStudent cannot log in"]
        GAP2 --> GAP3["⚠️ GAP: Students Tab lists Cognito STUDENT group\\nAdmin-added students NEVER appear in this list"]
    end

    subgraph KNOWN_GAPS ["Known Gaps (documented in codebase)"]
        G1["Admin-added students: DynamoDB only, no Cognito account"]
        G2["Students Tab: shows Cognito group users only"]
        G3["No bridge between optutor-students table and Cognito"]
        G4["No self-service enrollment flow for paid content"]
    end`

const API_ROUTES_DIAGRAM = `flowchart LR
    subgraph GW ["API Gateway (REST)\\nhttps://api-id.execute-api.us-east-2.amazonaws.com/prod"]
        direction TB
        RQ["ANY /{proxy+}\\nAll routes → Lambda"]
    end

    GW --> L["Lambda: optutor-api\\nhandler(event)\\n\\nRouting:\\nresource = path.split('/')[0]\\nid = path.split('/')[1]\\naction = path.split('/')[2]"]

    L --> ROLES_R["ROLES\\n/roles"]
    L --> USERS_R["USERS\\n/users"]
    L --> COURSES_R["COURSES\\n/courses"]
    L --> LIVE_R["LIVE-SESSIONS\\n/live-sessions"]
    L --> EMP_R["EMPLOYEES\\n/employees"]
    L --> STU_R["STUDENTS\\n/students"]

    ROLES_R --> R1["GET /roles\\nList all custom roles\\n⚡ Public — no auth required"]
    ROLES_R --> R2["POST /roles\\nCreate custom role\\n🔒 manage_roles"]
    ROLES_R --> R3["PUT /roles/:id\\nUpdate role name/permissions\\n🔒 manage_roles"]
    ROLES_R --> R4["DELETE /roles/:id\\nDelete role (non-system only)\\n🔒 manage_roles"]

    USERS_R --> U1["GET /users/me\\nGet own role + permissions\\n🔒 Auth required"]
    USERS_R --> U2["GET /users\\nList all UserRoles records\\n🔒 manage_roles"]
    USERS_R --> U3["PUT /users/:email/role\\nAssign role to user\\n🔒 manage_roles\\n🔒+ promote_admins for SUPER_ADMIN"]

    COURSES_R --> C1["GET /courses\\nList all courses\\n⚡ Optional auth (public list)"]
    COURSES_R --> C2["POST /courses\\nCreate course\\n🔒 manage_courses"]
    COURSES_R --> C3["PUT /courses/:id\\nUpdate course\\n🔒 manage_courses"]
    COURSES_R --> C4["DELETE /courses/:id\\nDelete course\\n🔒 manage_courses"]

    LIVE_R --> LV1["GET /live-sessions\\nList all sessions\\n⚡ Optional auth (public list)"]
    LIVE_R --> LV2["POST /live-sessions\\nCreate session\\n🔒 manage_courses"]
    LIVE_R --> LV3["PUT /live-sessions/:id\\nUpdate session\\n🔒 manage_courses"]
    LIVE_R --> LV4["DELETE /live-sessions/:id\\nDelete session\\n🔒 manage_courses"]

    EMP_R --> E1["GET /employees\\nList all employees (DDB)\\n🔒 manage_employees"]
    EMP_R --> E2["POST /employees\\nCreate employee + Cognito user\\n🔒 manage_employees\\n→ AdminCreateUser + AdminAddToGroup"]
    EMP_R --> E3["PUT /employees/:email\\nUpdate employee record\\n🔒 manage_employees"]
    EMP_R --> E4["DELETE /employees/:email\\nDelete employee + Cognito user\\n🔒 SUPER_ADMIN (promote_admins)"]
    EMP_R --> E5["POST /employees/:email/reset-password\\nReset Cognito password (temp)\\n🔒 SUPER_ADMIN"]

    STU_R --> S1["GET /students\\nList all students (DDB only)\\n🔒 manage_students"]
    STU_R --> S2["POST /students\\nAdd student to DDB\\n🔒 manage_students\\n⚠️ NO Cognito account created"]
    STU_R --> S3["PUT /students/:email\\nUpdate student record\\n🔒 manage_students"]
    STU_R --> S4["DELETE /students/:email\\nDelete student record\\n🔒 manage_students"]`

const CICD_DIAGRAM = `flowchart TD
    subgraph DEV ["Developer"]
        CODE["Write code"] --> PR["Open Pull Request"]
        PR --> MRG["Merge to main branch"]
    end

    subgraph FRONTEND_CI ["Frontend CI/CD — deploy.yml"]
        FT["Trigger: push to main (any file)"] --> FN["actions/setup-node@v4\\nNode 20 + npm ci"]
        FN --> FB["npm run build\\n→ Next.js static export to /out"]
        FB --> FE["Inject secrets as env vars:\\nNEXT_PUBLIC_COGNITO_USER_POOL_ID\\nNEXT_PUBLIC_COGNITO_CLIENT_ID\\nNEXT_PUBLIC_API_URL"]
        FE --> FS["aws s3 sync out/ → s3://optutor-com\\n• JS/CSS: max-age=31536000 immutable\\n• HTML/txt: no-cache"]
        FS --> FC["CloudFront invalidation: /*\\n(if TUTOR_CLOUDFRONT_DISTRIBUTION_ID set)"]
        FC --> LIVE_SITE["✅ Live at tutor.opportunitypool.com"]
    end

    subgraph BACKEND_CI ["Backend CI/CD — deploy-backend.yml"]
        BT["Trigger: push to main (lambda/**) OR workflow_dispatch"] --> BN["actions/setup-node@v4 + AWS creds"]
        BN --> BDDB["Create DynamoDB tables (idempotent):\\nOpTutor-Roles (pk: roleId)\\nOpTutor-UserRoles (pk: userEmail)\\nOpTutor-RoleRequests (pk: requestId)\\nOpTutor-Courses (pk: courseId)\\nOpTutor-LiveSessions (pk: sessionId)"]
        BDDB --> BIAM["Create IAM role: optutor-lambda-role\\nPolicies: AWSLambdaBasicExecutionRole\\n+ DynamoDB (OpTutor-* + optutor-*)\\n+ S3 (optutor-com/profile-pictures/*)\\n+ Cognito admin actions"]
        BIAM --> BZIP["npm install --production\\nzip -r lambda.zip ."]
        BZIP --> BLAM["Deploy Lambda: optutor-api\\nRuntime: nodejs22.x\\nTimeout: 30s, Memory: 256MB\\nEnv: PROFILE_BUCKET, COGNITO_USER_POOL_ID"]
        BLAM --> BAGW["Create/update API Gateway: OpTutorAPI\\n• Resource: {proxy+}\\n• Method: ANY → Lambda AWS_PROXY\\n• OPTIONS: MOCK with CORS headers\\n• Deploy stage: prod"]
        BAGW --> BSEED["node seed.mjs — seed default roles to DDB"]
        BSEED --> BSADMIN["DDB put-item → OpTutor-UserRoles:\\nmanoj@oppertunitypool.com = SUPER_ADMIN"]
        BSADMIN --> BSAVE["gh secret set NEXT_PUBLIC_API_URL\\n(auto-updates frontend config)"]
        BSAVE --> LIVE_API["✅ API live at\\nhttps://api-id.execute-api.us-east-2.amazonaws.com/prod"]
    end

    MRG --> FT
    MRG --> BT`

/* ─── Component ───────────────────────────────────────────────────────────── */

export default function FlowDocsPage() {
  const [mermaidReady, setMermaidReady] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined') return
    // If already loaded (e.g. hot reload), just run
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if ((window as any).mermaid) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ;(window as any).mermaid.initialize({
        startOnLoad: false,
        theme: 'neutral',
        fontFamily: 'Inter, ui-sans-serif, system-ui, sans-serif',
        flowchart: { useMaxWidth: true, htmlLabels: true, curve: 'basis' },
        sequence: { useMaxWidth: true },
      })
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ;(window as any).mermaid.run().then(() => setMermaidReady(true))
      return
    }

    const existing = document.getElementById('mermaid-cdn')
    if (existing) return

    const script = document.createElement('script')
    script.id = 'mermaid-cdn'
    script.src = 'https://cdn.jsdelivr.net/npm/mermaid@10/dist/mermaid.min.js'
    script.onload = () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ;(window as any).mermaid.initialize({
        startOnLoad: false,
        theme: 'neutral',
        fontFamily: 'Inter, ui-sans-serif, system-ui, sans-serif',
        flowchart: { useMaxWidth: true, htmlLabels: true, curve: 'basis' },
        sequence: { useMaxWidth: true },
      })
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ;(window as any).mermaid.run().then(() => setMermaidReady(true))
    }
    document.head.appendChild(script)
  }, [])

  return (
    <main className="max-w-7xl mx-auto px-4 py-10 space-y-16">
      {/* Header */}
      <header className="border-b pb-6">
        <div className="flex items-center gap-3 mb-2">
          <span className="text-3xl">🗺️</span>
          <h1 className="text-4xl font-extrabold text-gray-900">OpTutor — System Flow Reference</h1>
        </div>
        <p className="text-gray-500 text-lg mt-1">
          Comprehensive end-to-end flows, business rules, and data paths generated from source code.
          Use this as the reference for all future development decisions.
        </p>
        <div className="flex gap-4 mt-4 text-sm text-gray-400">
          <span>📦 Source: <code className="bg-gray-100 px-1 rounded">manoj0456/op_tutor_web</code></span>
          <span>🔒 Visible to: <strong className="text-purple-700">SUPER_ADMIN only</strong></span>
          <span>🔑 Gate: <code className="bg-gray-100 px-1 rounded">manage_roles</code></span>
        </div>
        {!mermaidReady && (
          <div className="mt-4 text-sm text-blue-600 animate-pulse">⏳ Loading diagrams…</div>
        )}
      </header>

      {/* TOC */}
      <nav className="bg-gray-50 rounded-2xl p-6 border border-gray-200">
        <h2 className="font-bold text-gray-800 text-lg mb-3">Contents</h2>
        <ol className="grid sm:grid-cols-2 gap-1 text-sm">
          {[
            ['#auth', '1. Authentication Flow'],
            ['#permissions', '2. Role & Permission Model'],
            ['#page-access', '3. Page Access Matrix'],
            ['#employee-lifecycle', '4. Employee Lifecycle'],
            ['#student-lifecycle', '5. Student Lifecycle (+ Known Gaps)'],
            ['#api-routes', '6. API Routes Map'],
            ['#cicd', '7. CI/CD Pipeline'],
          ].map(([href, label]) => (
            <li key={href}>
              <a href={href} className="text-primary-600 hover:underline hover:text-primary-800 transition">
                {label}
              </a>
            </li>
          ))}
        </ol>
      </nav>

      {/* ── 1. Auth Flow ─────────────────────────────────────────────────────── */}
      <Section id="auth" title="1. Authentication Flow" icon="🔐" description={
        <>
          Full Cognito auth lifecycle: sign-in, first-time forced password change, forgot-password reset,
          session restore on reload, and logout. All auth is handled by{' '}
          <code>src/context/AuthContext.tsx</code> + <code>src/components/shared/LoginForm.tsx</code>.
        </>
      }>
        <KeyPoints items={[
          'Cognito User Pool: standard SRP auth via amazon-cognito-identity-js',
          'FORCE_CHANGE_PASSWORD: employees created by admin must set a new password on first login',
          'Session restore: AuthProvider reads userPool.getCurrentUser() on mount — no extra API call',
          'signOut() clears the Cognito pool without a server call — purely client-side',
          'Forgot password: two-step flow (send code → confirm with code + new password)',
        ]} />
        <DiagramBox diagram={AUTH_DIAGRAM} />
      </Section>

      {/* ── 2. Permissions ───────────────────────────────────────────────────── */}
      <Section id="permissions" title="2. Role & Permission Model" icon="🎭" description={
        <>
          How <code>PermissionContext</code> loads and resolves permissions for each logged-in user.
          Two-layer system: Cognito groups (static) override-able by custom roles in DynamoDB.
        </>
      }>
        <KeyPoints items={[
          'Four Cognito groups: SUPER_ADMIN, ADMIN, TEACHER, STUDENT',
          'Custom roles stored in DynamoDB OpTutor-Roles table with arbitrary permission arrays',
          'Custom role matching: only applies when user has a Cognito group AND that group name matches a custom role name (prevents phantom STUDENT matches)',
          'UserRoles table (OpTutor-UserRoles): maps userEmail → roleId/roleName; populated by PUT /users/:email/role',
          'SUPER_ADMIN role assignment requires promote_admins permission (guards privilege escalation)',
          'Permissions are a Set<string> in context; hasPermission() is O(1)',
        ]} />
        <DiagramBox diagram={PERM_DIAGRAM} />

        {/* Permission keys table */}
        <div className="mt-6">
          <h3 className="text-base font-bold text-gray-800 mb-3">Permission Keys Reference</h3>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm border-collapse">
              <thead>
                <tr className="bg-gray-100 text-left">
                  <th className="border px-3 py-2 font-semibold">Permission Key</th>
                  <th className="border px-3 py-2 font-semibold">What it gates</th>
                  <th className="border px-3 py-2 font-semibold">SUPER_ADMIN</th>
                  <th className="border px-3 py-2 font-semibold">ADMIN</th>
                  <th className="border px-3 py-2 font-semibold">TEACHER</th>
                  <th className="border px-3 py-2 font-semibold">STUDENT</th>
                </tr>
              </thead>
              <tbody>
                {[
                  ['view_courses', 'Courses nav link + page access', '✅','✅','✅','✅'],
                  ['view_live', 'Live Sessions nav link + page access', '✅','✅','✅','✅'],
                  ['view_content', 'Paid content access (future)', '✅','❌','❌','✅'],
                  ['manage_courses', 'Content Management nav + CRUD courses/live', '✅','✅','✅','❌'],
                  ['manage_roles', 'Roles page nav + CRUD roles/employees/students tabs', '✅','✅','❌','❌'],
                  ['manage_employees', 'Employees tab: Add/Edit employee', '✅','✅','❌','❌'],
                  ['manage_students', 'Students tab: Add student', '✅','✅','❌','❌'],
                  ['promote_admins', 'Assign SUPER_ADMIN role to users', '✅','✅','❌','❌'],
                ].map(([key, desc, sa, ad, te, st]) => (
                  <tr key={key} className="even:bg-gray-50">
                    <td className="border px-3 py-2"><code className="bg-gray-100 rounded px-1">{key}</code></td>
                    <td className="border px-3 py-2 text-gray-600">{desc}</td>
                    <td className="border px-3 py-2 text-center">{sa}</td>
                    <td className="border px-3 py-2 text-center">{ad}</td>
                    <td className="border px-3 py-2 text-center">{te}</td>
                    <td className="border px-3 py-2 text-center">{st}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </Section>

      {/* ── 3. Page Access Matrix ────────────────────────────────────────────── */}
      <Section id="page-access" title="3. Page Access Matrix" icon="📄" description={
        <>How each page/route is gated in the Navbar and at the page level.</>
      }>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm border-collapse">
            <thead>
              <tr className="bg-gray-100 text-left">
                <th className="border px-3 py-2 font-semibold">Route</th>
                <th className="border px-3 py-2 font-semibold">Navbar Gate</th>
                <th className="border px-3 py-2 font-semibold">Page-level Gate</th>
                <th className="border px-3 py-2 font-semibold">Public Access?</th>
                <th className="border px-3 py-2 font-semibold">Notes</th>
              </tr>
            </thead>
            <tbody>
              {[
                ['/','None','None','✅ Yes','Marketing landing page'],
                ['/login','None (shown when !user)','None','✅ Yes','LoginForm with challenge handling'],
                ['/signup','None','None','✅ Yes','Self-service student registration'],
                ['/courses','view_courses (or !loaded)','None','✅ Partial','Paid courses locked for unauthenticated users (🔒 overlay)'],
                ['/live','view_live (or !loaded)','None','✅ Partial','Paid sessions locked for unauthenticated users'],
                ['/content-management','manage_courses (must be loaded)','Redirects if no permission','❌ No','CRUD for courses + live sessions'],
                ['/roles','manage_roles (must be loaded)','Redirects if no permission','❌ No','3 tabs: Students, Employees, Roles'],
                ['/docs/flow','manage_roles (SUPER_ADMIN)','—','❌ No','This page — system flow reference'],
                ['/admin/courses','(legacy/old path)','—','—','Old admin route, may redirect to /content-management'],
                ['/admin/roles','(legacy/old path)','—','—','Old admin route, may redirect to /roles'],
              ].map(([route, nav, page, pub, notes]) => (
                <tr key={route} className="even:bg-gray-50">
                  <td className="border px-3 py-2 font-mono text-xs">{route}</td>
                  <td className="border px-3 py-2 text-xs"><code className="bg-gray-100 rounded px-1">{nav}</code></td>
                  <td className="border px-3 py-2 text-xs">{page}</td>
                  <td className="border px-3 py-2 text-center text-xs">{pub}</td>
                  <td className="border px-3 py-2 text-xs text-gray-600">{notes}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg text-sm">
          <strong>📌 Navbar loading pattern:</strong> Courses and Live links use{' '}
          <code>(!loaded || hasPermission(...))</code> — they show optimistically while permissions
          load, then hide if the user lacks access. Content Management and Roles use{' '}
          <code>(loaded && hasPermission(...))</code> — they stay hidden until permissions are confirmed.
        </div>
      </Section>

      {/* ── 4. Employee Lifecycle ────────────────────────────────────────────── */}
      <Section id="employee-lifecycle" title="4. Employee Lifecycle" icon="👔" description={
        <>
          How employees are provisioned, onboarded, and managed. Employees are created in both
          Cognito (for auth) and DynamoDB (for profile data). Managed via <code>/roles</code> page → Employees tab.
        </>
      }>
        <KeyPoints items={[
          'Add employee: requires manage_employees (ADMIN or SUPER_ADMIN)',
          'Lambda generates a 12-char secure temp password (upper + lower + digits + special, shuffled)',
          'Cognito AdminCreateUser with MessageAction: SUPPRESS — co auto email, admin shares password manually',
          'Employee is added to their Cognito group (e.g. TEACHER) via AdminAddUserToGroup',
          'On first login: FORCE_CHANGE_PASSWORD challenge — employee must set new password before accessing app',
          'Edit employee: ADMIN+ can update name, department, phone, status (not email)',
          'Delete employee: SUPER_ADMIN only — removes from both Cognito and DynamoDB',
          'Reset password: SUPER_ADMIN only — AdminSetUserPassword with permanent:false triggers new challenge',
        ]} />
        <DiagramBox diagram={EMPLOYEE_DIAGRAM} height="700px" />
      </Section>

      {/* ── 5. Student Lifecycle ─────────────────────────────────────────────── */}
      <Section id="student-lifecycle" title="5. Student Lifecycle" icon="🎓" description={
        <>
          Two paths for adding students — self-registration (complete) and admin-added (incomplete).
          Contains known gaps that need future work.
        </>
      }>
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-sm mb-4">
          <strong>⚠️ Known Gaps:</strong> The admin-added student path is incomplete. Students added
          via the UI are saved only to DynamoDB and cannot log in. The Students tab lists Cognito users
          only, so admin-added students never appear there.
        </div>
        <DiagramBox diagram={STUDENT_DIAGRAM} />
      </Section>

      {/* ── 6. API Routes ────────────────────────────────────────────────────── */}
      <Section id="api-routes" title="6. API Routes Map" icon="🛣️" description={
        <>
          All Lambda endpoints. Base URL: <code>NEXT_PUBLIC_API_URL</code> (set as GitHub secret after
          backend deploy). Routing pattern: <code>resource/id/action</code> from path segments after
          stripping <code>/prod/</code> prefix.
        </>
      }>
        <KeyPoints items={[
          'Single Lambda function handles ALL routes via path matching (no separate functions per endpoint)',
          'Auth: all protected routes call getCallerContext(event) which decodes JWT and checks UserRoles table',
          'GET /roles is intentionally public (no auth) — frontend needs it to load permission context',
          'GET /courses and GET /live-sessions accept optional auth — token enriches response if present',
          'CORS: Access-Control-Allow-Origin: * with OPTIONS MOCK integration at API Gateway level',
          'ensureTable(): auto-creates DynamoDB tables on first Lambda cold start if they do not exist',
        ]} />
        <DiagramBox diagram={API_ROUTES_DIAGRAM} height="900px" />

        {/* Auth guard rules table */}
        <div className="mt-6">
          <h3 className="text-base font-bold text-gray-800 mb-3">Auth Guard Rules Summary</h3>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm border-collapse">
              <thead>
                <tr className="bg-gray-100 text-left">
                  <th className="border px-3 py-2">Endpoint</th>
                  <th className="border px-3 py-2">Method</th>
                  <th className="border px-3 py-2">Required Permission</th>
                  <th className="border px-3 py-2">Extra Rule</th>
                </tr>
              </thead>
              <tbody>
                {[
                  ['GET /roles','GET','None (public)','—'],
                  ['POST/PUT/DELETE /roles','*','manage_roles','System roles cannot be deleted (isSystem flag)'],
                  ['GET /users/me','GET','Auth (any)','Returns default STUDENT if no UserRoles entry'],
                  ['GET /users','GET','manage_roles','—'],
                  ['PUT /users/:email/role','PUT','manage_roles','roleId=SUPER_ADMIN also requires promote_admins'],
                  ['GET /courses','GET','None (optional auth)','—'],
                  ['POST/PUT/DELETE /courses','*','manage_courses','—'],
                  ['GET /live-sessions','GET','None (optional auth)','—'],
                  ['POST/PUT/DELETE /live-sessions','*','manage_courses','—'],
                  ['GET /employees','GET','manage_employees','—'],
                  ['POST /employees','POST','manage_employees','Also calls Cognito AdminCreateUser'],
                  ['PUT /employees/:email','PUT','manage_employees','—'],
                  ['DELETE /employees/:email','DELETE','promote_admins (SUPER_ADMIN only)','Also calls Cognito AdminDeleteUser'],
                  ['POST /employees/:email/reset-password','POST','promote_admins (SUPER_ADMIN only)','AdminSetUserPassword with permanent:false'],
                  ['GET/POST/PUT/DELETE /students','*','manage_students','DynamoDB only — co Cognito operations'],
                ].map(([ep, method, perm, extra]) => (
                  <tr key={ep} className="even:bg-gray-50">
                    <td className="border px-3 py-2 font-mono text-xs">{ep}</td>
                    <td className="border px-3 py-2 text-xs">{method}</td>
                    <td className="border px-3 py-2 text-xs"><code className="bg-gray-100 rounded px-1">{perm}</code></td>
                    <td className="border px-3 py-2 text-xs text-gray-600">{extra}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </Section>

      {/* ── 7. CI/CD ─────────────────────────────────────────────────────────── */}
      <Section id="cicd" title="7. CI/CD Pipeline" icon="⚙️" description={
        <>
          Two independent GitHub Actions workflows: frontend (always on push to main) and backend
          (on push to <code>lambda/**</code> or manual dispatch).
        </>
      }>
        <KeyPoints items={[
          'Frontend: Next.js static export → S3 bucket (optutor-com) → CloudFront CDN',
          'Backend: Lambda (optutor-api) → API Gateway (OpTutorAPI, stage: prod) → us-east-2',
          'Backend deploy is idempotent: creates DynamoDB tables and IAM role only if missing',
          'After backend deploy, API URL is auto-saved as GitHub secret NEXT_PUBLIC_API_URL',
          'Lambda is Node.js 22.x runtime, 30s timeout, 256MB memory',
          'Seed step: default roles + manoj@opportunitypool.com as SUPER_ADMIN are seeded on every backend deploy',
          'DynamoDB tables use PAY_PER_REQUEST billing (no provisioned capacity to manage)',
        ]} />
        <DiagramBox diagram={CICD_DIAGRAM} height="700px" />

        <div className="mt-4 grid sm:grid-cols-2 gap-4 text-sm">
          <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
            <strong className="block mb-1">Frontend Resources</strong>
            <ul className="space-y-1 text-gray-700 text-xs">
              <li>• S3 bucket: <code>optutor-com</code></li>
              <li>• CloudFront distribution (via secret)</li>
              <li>• Domain: tutor.opportunitypool.com</li>
            </ul>
          </div>
          <div className="p-4 bg-green-50 rounded-lg border border-green-200">
            <strong className="block mb-1">Backend Resources</strong>
            <ul className="space-y-1 text-gray-700 text-xs">
              <li>• Lambda: <code>optutor-api</code> (us-east-2)</li>
              <li>• API GW: <code>OpTutorAPI</code> (REST, regional)</li>
              <li>• IAM role: <code>optutor-lambda-role</code></li>
              <li>• DynamoDB: 5 OpTutor-* tables + 2 optutor-* tables</li>
              <li>• S3 profile pics: <code>optutor-com/profile-pictures/</code></li>
              <li>• Cognito User Pool (existing — cot created by CI)</li>
            </ul>
          </div>
        </div>
      </Section>

      <footer className="border-t pt-6 text-xs text-gray-400 text-center">
        OpTutor Flow Reference • Generated from source • Visible to SUPER_ADMIN only •{' '}
        <code>src/app/docs/flow/page.tsx</code>
      </footer>
    </main>
  )
}

/* ─── Helper components ───────────────────────────────────────────────────── */

function Section({
  id, title, icon, description, children,
}: {
  id: string
  title: string
  icon: string
  description: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <section id={id} className="scroll-mt-20">
      <div className="flex items-center gap-3 mb-2">
        <span className="text-2xl">{icon}</span>
        <h2 className="text-2xl font-bold text-gray-900">{title}</h2>
      </div>
      <p className="text-gray-600 text-sm mb-5">{description}</p>
      {children}
    </section>
  )
}

function KeyPoints({ items }: { items: string[] }) {
  return (
    <div className="mb-5 p-4 bg-blue-50 border border-blue-100 rounded-xl">
      <strong className="text-sm font-semibold text-blue-900 block mb-2">📋 Business Rules & Key Facts</strong>
      <ul className="space-y-1">
        {items.map((item, i) => (
          <li key={i} className="text-sm text-blue-800 flex gap-2">
            <span className="text-blue-400 shrink-0">•</span>
            {item}
          </li>
        ))}
      </ul>
    </div>
  )
}

function DiagramBox({ diagram, height = '500px' }: { diagram: string; height?: string }) {
  return (
    <div
      className="border border-gray-200 rounded-2xl bg-white p-4 overflow-auto"
      style={{ maxHeight: height }}
    >
      <div className="mermaid text-sm">{diagram}</div>
    </div>
  )
}
