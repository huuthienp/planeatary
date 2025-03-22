export const respIdRegex = /R_[a-zA-Z0-9]{15}/;
export const userIdRegex = /[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/i;
export const respIdWholeRegex = /^R_[a-zA-Z0-9]{15}$/;
export const userIdWholeRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export const passwdWholeRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;
