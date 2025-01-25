export class CustomResponse extends Response {
  constructor(body = 'Success', status = 200) {
    const strBody = typeof body === 'string' ? body
      : JSON.stringify(body);

    let contentType;

    try {
      JSON.parse(strBody);
      contentType = 'application/json';
    } catch {
      contentType = 'text/plain';
    }

    const options = {
      status: status,
      headers: { 'Content-Type': contentType }
    };

    super(strBody, options);
  }
}
