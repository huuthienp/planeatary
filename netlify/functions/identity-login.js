export async function handler(event) {
    const { user } = JSON.parse(event.body);
    const { app_metadata } = user;
    const { roles } = app_metadata;  // an array
    const newRoles = new Set();
    for (let r of roles) { newRoles.add(r); }
    newRoles.add('tester');
    return {
        body: JSON.stringify({
            ...user,
            app_metadata: {
                ...app_metadata,
                roles: Array.from(newRoles),
                last_login_at: (new Date()).toISOString(),
            },
        }),
        statusCode: 200,
    };
}
