interface QualtricsPayload {
    result: object;
    meta: { httpStatus: string, requestId: string };
}  /* end of QualtricsPayload */


function formulateErrorResponse(err: Error, options?: { lambda?: boolean }): Response | {body: string, statusCode: number} {
    let code: number, msg: string;
    let headers = {};
    try {  /* parse error message as JSON */
        const parsed = JSON.parse(err.message);  // error be caught below
        code = parsed?.code ?? 500;
        msg = parsed?.msg ?? err.message;
        headers = parsed?.headers;
    } catch(parseErr) {  /* return error message as is and status 500 */
        code = 500;
        msg = err.message;
    }  /* end of trying parsing */
    headers ??= {};
    if (options?.lambda) { return {body: msg, headers, statusCode: code}; }
    return Response.json({ code, msg }, { headers, status: code });
}  /* end of formulateErrorResponse */


export { QualtricsPayload, formulateErrorResponse };
