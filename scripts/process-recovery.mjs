let params;
const pwRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[ -~]{8,}$/;
const doc = { qs: s => document.querySelector(s) };
const form = doc.qs('#resetPasswordForm');
const newPwInp = doc.qs('#newPasswordInput');
const confPwInp = doc.qs('#confirmPasswordInput');
const apiFb = doc.qs('#apiFeedback');
const navBtn = doc.qs('nav ul > li > button');
const navEntry = navBtn.parentElement;
const setPwBtn = doc.qs('#setNewPasswordButton');
const container = doc.qs('#resetPasswordModal');
const modal = bootstrap.Modal.getOrCreateInstance('#resetPasswordModal');

try {  // get recovery parameters and send request on button click
    /* Get params */
    params = getRecoveryParams(window.location.search);
    if (null !== params) {
        /* Add listeners */
        setPwBtn.addEventListener('click', processRequest);
        form.addEventListener('submit', (event) => { event.preventDefault(); setPwBtn.click(); });
        confPwInp.addEventListener('input', (event) => { removeFeedback(event.target); });
        /* Add button */
        const navBtn_ = navBtn.cloneNode();
        const navEntry_ = navEntry.cloneNode();
        navBtn_.textContent = 'Reset password';
        navBtn_.setAttribute('data-bs-target', '#resetPasswordModal');
        navBtn_.addEventListener('click', resetModal_());  // currying requires calling resetModal_
        navEntry_.appendChild(navBtn_);
        navEntry.parentElement.appendChild(navEntry_);
        /* Show modal */
        modal.show();
        await makeDispFlex(container);
    } else {  // parameters not found
        modal && modal.dispose();
    } /* end of if params are found */
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
    removeFeedback(newPwInp, confPwInp, apiFb);
    const trimmedNewPw = newPwInp.value.trim();
    const trimmedConfPw = confPwInp.value.trim();
    if (trimmedNewPw !== newPwInp.value || trimmedConfPw !== confPwInp.value) {
        if (!confirm('Leading/trailing whitespaces will be trimmed.')) { return; }
    }  // skip if confirm is false
    const pwStrong = updateFeedback(newPwInp, pwRegex.test(trimmedNewPw));
    const confirmed = updateFeedback(confPwInp, ''!==trimmedConfPw && trimmedNewPw===trimmedConfPw);
    if (pwStrong && confirmed) {
        const opt = {};
        opt.method = 'PUT';
        opt.body = JSON.stringify({...params, password: trimmedNewPw});  // important
        fetch('/api/recovery', opt)
            .then(async response => {
                const { ok: respOk, status } = response;
                newPwInp.value = '';
                confPwInp.value = '';
                updateFeedback(apiFb, respOk);
                const msg = await response.text();
                if (respOk) {  // password is updated
                    setPwBtn.removeEventListener('click', processRequest);
                    console.log(status, msg);
                } else {  // status besides 200-299
                    const notOkErr = new Error(`${status} ${msg}`);
                    notOkErr.name = 'ResponseNotOkError';
                    throw notOkErr;
                }  /* end of if response is ok */
            })  /* end of then */
            .catch(err =>  console.error('Caught:', err) );
        removeFeedback(newPwInp, confPwInp);
    }  /* end of if password is validated */
}  /* end of processRequest */


function updateFeedback(tag, condition) {
    if (true === condition) {
        tag.classList.add('is-valid');
        tag.classList.remove('is-invalid');
    } else if (false === condition) {
        tag.classList.add('is-invalid');
        tag.classList.remove('is-valid');
    }  /* end of checking condition */
    return condition;
}  /* end of updateFeedback */


function removeFeedback(...tags) {
    for (const tag of tags) {
        tag.classList.remove('is-valid');
        tag.classList.remove('is-invalid');
    }  /* end of loop for removing class */
}  /* end of removeFeedback */


function resetModal_() {  // currying
    return async function resetModal() {
        removeFeedback(newPwInp, confPwInp, apiFb);
        await makeDispFlex(container);
    };  /* end of resetModal */
}  /* end of resetModal_ */


async function makeDispFlex(tag) {
    await new Promise(x => setTimeout(x, 200));
    tag.style.display = 'flex';
}  /* end of makeDispFlex */
