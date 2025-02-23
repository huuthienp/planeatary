let params;
const pwRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;
const doc = { qs: s => document.querySelector(s) };
const form = doc.qs('#resetPasswordForm');
const newPwInp = doc.qs('#newPasswordInput');
const confirmPwInp = doc.qs('#confirmPasswordInput');
const setPwBtn = doc.qs('#setNewPasswordButton');
const container = doc.qs('#resetPasswordModal');
const modal = bootstrap.Modal.getOrCreateInstance('#resetPasswordModal');

try {  // get recovery parameters and send request on button click
    /* Get params */
    params = getRecoveryParams(window.location.search);
    if (null !== params) {
        /* Add listeners */
        setPwBtn.addEventListener('click', processRequest);
        form.addEventListener('submit', () => { event.preventDefault(); setPwBtn.click(); });
        /* Show modal */
        modal.show();
        container.style.display = 'flex';
    }  /* end of if params are found */
} catch(err) {
    console.error('Caught:', err);
}  /* end of main try-catch */


function getRecoveryParams(searchQuery) {
    const params = new URLSearchParams(searchQuery);
    const decoy = params.get('decoy');
    const token = params.get('token');
    if (null===decoy || null===token) { return null; }
    return ({ decoy, token });
} /* end of getRecoveryParams */


function processRequest() {
    const goodPw = checkWithFeedback(newPwInp, pwRegex.test(newPwInp.value));
    const confirmed = checkWithFeedback(confirmPwInp, newPwInp.value === confirmPwInp.value);
    if (goodPw && confirmed) {
        const opt = {};
        opt.method = 'PUT';
        opt.body = JSON.stringify({...params, password: newPwInp.value});
        fetch('/api/recovery', opt)
            .then(async response => {
                const { ok, status } = response;
                const msg = await response.text();
                if (ok) {  // password is updated
                    modal.hide();
                    modal.dispose();
                    setPwBtn.removeEventListener('click', processRequest);
                    console.log(status, msg);
                } else {  // status besides 200-299
                    const notOkErr = new Error(`${status} ${msg}`);
                    notOkErr.name = 'ResponseNotOkError';
                    throw notOkErr;
                }  /* end of if response is ok */
            })  /* end of then */
            .catch(err =>  console.error('Caught:', err) );
    }  /* end of if password is validated */
}  /* end of processRequest */


function checkWithFeedback(tag, condition) {
    if (false === condition) { tag.classList.add('is-invalid'); }
    else { tag.classList.remove('is-invalid') }
    return condition;
}  /* end of checkWithFeedback */
