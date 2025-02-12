export async function handler(event) {
    const { user } = JSON.parse(event.body);
    // user.user_metadata.responseHistory = [];
    const body = JSON.stringify(user);
    let statusCode = 200;  // can block event with non-2xx status
    return ({ body, statusCode });
};
