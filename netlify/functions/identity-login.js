export async function handler(event) {
  const user = JSON.parse(event.body).user;
  return {
    body: JSON.stringify({
      ...user,
      app_metadata: {
        ...user.app_metadata,
        roles: ['vip'],
      },
    }),
    statusCode: 200,
  };
}

