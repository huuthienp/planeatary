export class CustomResponse extends Response {
  constructor(body = 'Success', status = 200) {
    const bodyStr = typeof body === 'string' ? body : JSON.stringify(body);
    let headers = {};
    try {  // v2
      JSON.parse(bodyStr);
      headers = { 'Content-Type': 'application/json' };
    } catch { ; }
    const options = ({ status, headers });
    super(bodyStr, options);
  }
}
