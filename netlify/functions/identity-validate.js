import { isDisposableEmail } from 'disposable-email-domains-js';

export async function handler(event) {
    const user = JSON.parse(event.body).user;
    const { email } = user;
    const domain = email.substring(email.indexOf('@') + 1)
    const spam = isDisposableEmail(email);
    if (spam) {
        console.error(domain, 'can be disposable:', spam.toString().toUpperCase());
        return {
            statusCode: 400,
        }
    };
    return {
        body: JSON.stringify(user),
        statusCode: 200,
    };
}
