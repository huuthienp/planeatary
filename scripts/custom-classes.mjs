export class CustomResponse extends Response {
  constructor(body = 'Success', status = 200) {
    const bodyStr = typeof body === 'string' ? body : JSON.stringify(body);
    let headers = {};
    try {  // v2: add content type for JSON only
      JSON.parse(bodyStr);
      headers = { 'Content-Type': 'application/json' }
    } catch {}
    const options = ({ status, headers });
    super(bodyStr, options);
  }
}
