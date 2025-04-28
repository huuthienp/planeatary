const { Q_API_TOKEN, Q_URL, USERS_IDP_ID } = process.env;


export async function handler(event) {
    const response = {};
    const payload = JSON.parse(event.body);
    const { user } = payload;
    // user.user_metadata.responseHistory = [];
    // response.body = JSON.stringify(user);
    const qResponse = await createUserRecord(user);
    console.log(await qResponse.json());
    logOrError({ event: payload.event, ok: qResponse.ok });
    response.statusCode = qResponse.status;
    return response;
}  // function handler


async function createUserRecord(user) {
    // https://api.qualtrics.com/47455b8dc2201-add-records-to-imported-data-project
    const url = new URL(Q_URL);
    url.pathname = `/API/v3/imported-data-projects/${USERS_IDP_ID}/records`;
    const { id, email, user_metadata } = user;
    const { status } = user_metadata;
    const opt = { headers: new Headers() };
    opt.body = JSON.stringify({ records: [{ id, email, status }] });
    opt.headers.set("accept", "application/json");
    opt.headers.set("content-type", "application/json");
    opt.headers.set("x-api-token", Q_API_TOKEN);
    opt.method = "POST";
    const response = await fetch(url, opt);
    return response;
}  // createUserRecord


function logOrError({ event, ok }) {
    const msg = ok ? "success" : "failure";
    const log = ok ? (...args)=>console.log(args) : (...args)=>console.error(args);
    log(event, msg);
}  // logOrError
