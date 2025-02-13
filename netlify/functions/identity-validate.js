import { isDisposableEmail } from 'disposable-email-domains-js';


export async function handler(event) {  // check for spam and missing metadata
    const { user } = JSON.parse(event.body);
    console.log(user);
    const { email, user_metadata: userMetaData } = user;
    const missingMetaData = validateMetaData(userMetaData ?? {});
    let body, error;
    let statusCode = 400;  // reject signup by default
    if (isDisposableEmail(email)) {
        body = error = 'Email may be disposable!';
    } else if (missingMetaData.length > 0) {
        body = error = `Metadata missing: ${missingMetaData.join(', ')}!`;
    } else {  // approve signup
        body = JSON.stringify(user);
        statusCode = 200;
    }  // end of checking
    console.log(email, error ?? 'Approved!');
    return ({ body, statusCode });
}  // end of handler v2


function validateMetaData(data, requiredKeys = ['age', 'gender', 'status']) {
    return missingKeys = requiredKeys.filter(key => !Object.hasOwn(data, key));
}  // end of validateMetaData v1
