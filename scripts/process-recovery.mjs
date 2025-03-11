const doc = { qs: s => document.querySelector(s) };
const newPwInp = doc.qs('#newPasswordInput');
const confPwInp = doc.qs('#confirmPasswordInput');
const apiFb = doc.qs('#apiFeedback');
const navBtn = doc.qs('nav ul > li > button');
const navEntry = navBtn.parentElement;
const setPwBtn = doc.qs('#setNewPasswordButton');

try {  // get recovery parameters and send request on button click
    /* Get params and initiate */
    const { decoy, token } = getRecoveryParams(window.location.search);
    const pwRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[ -~]{8,}$/;
    const form = doc.qs('#resetPasswordForm');
    const container = doc.qs('#resetPasswordModal');
    const modal = bootstrap.Modal.getOrCreateInstance('#resetPasswordModal');
    /* Add input listeners */
    const checkPwStrong = () => {
        const newPw = newPwInp.value;
        if (newPw.trim() !== newPw) { alert('Leading/trailing whitespaces will be trimmed.'); }
        updateFeedback(newPwInp, pwRegex.test(newPw.trim()));
    };  /* end of checkPwStrong */
    const checkPwMatch = () => {
        const confPw = confPwInp.value;
        const newPw = newPwInp.value;
        if (confPw.trim() !== confPw) { alert('Leading/trailing whitespaces will be trimmed.'); }
        updateFeedback(confPwInp, ''!==confPw.trim() && newPw.trim()===confPw.trim());
    };  /* end of checkPwMatch */
    newPwInp.addEventListener('blur', checkPwStrong);
    newPwInp.addEventListener('blur', checkPwMatch);
    confPwInp.addEventListener('blur', checkPwMatch);
    confPwInp.addEventListener('input', (event) => { removeFeedback(event.target); });
    /* Add button listener */
    const clickResetPw = () => processRequest(({ decoy, token }), pwRegex);
    setPwBtn.addEventListener('click', clickResetPw);
    form.addEventListener('submit', (event) => { event.preventDefault(); setPwBtn.click(); });
    /* Add button to navigation bar */
    const clickOpenModal = () => {
        newPwInp.value = '';
        confPwInp.value = '';
        removeFeedback(newPwInp, confPwInp, apiFb);
        changeDisplay(container, 'flex', 200).then(x=>console.log(x)).catch(e=>console.warn('Caught', e));
    };  /* open modal in flex display and with no feedback or input */
    addPwResetBtn(clickOpenModal);
    /* Show modal */
    modal.show();
    changeDisplay(container, 'flex', 200).then(x=>console.log(x)).catch(e=>console.warn('Caught', e));
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


function processRequest(params, pwRegex) {
    removeFeedback(apiFb);
    const trimmedNewPw = newPwInp.value.trim();
    const trimmedConfPw = confPwInp.value.trim();
    const pwStrong = pwRegex.test(trimmedNewPw);
    const pwConfirmed = ''!==trimmedConfPw && trimmedNewPw===trimmedConfPw;
    if (pwStrong && pwConfirmed) {
        newPwInp.value = '';
        confPwInp.value = '';
        const opt = {};
        opt.method = 'PUT';
        opt.body = JSON.stringify({...params, password: trimmedNewPw});  // important
        fetch('/api/recovery', opt)
            .then(async response => {
                const { ok: respOk, status } = response;
                updateFeedback(apiFb, respOk);
                const msg = await response.text();
                if (respOk) {  // password is updated
                    console.log(status, msg);
                } else {  // status besides 200-299
                    const notOkErr = new Error(`${status} ${msg}`);
                    notOkErr.name = 'ResponseNotOkError';
                    throw notOkErr;
                }  /* end of if response is ok */
            })  /* end of then */
            .catch(err =>  console.error('Caught:', err) );
    } else {  // password not strong or not confirmed
        updateFeedback(newPwInp, pwStrong);
        updateFeedback(confPwInp, pwConfirmed);
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


function addPwResetBtn(clickHandler, target='#resetPasswordModal', text='Reset password') {
    const navBtn_ = navBtn.cloneNode();
    const navEntry_ = navEntry.cloneNode();
    navBtn_.setAttribute('data-bs-target', target);
    navBtn_.textContent = text;
    navBtn_.addEventListener('click', clickHandler);
    navEntry_.appendChild(navBtn_);
    navEntry.parentElement.appendChild(navEntry_);
}  /* end of addPwResetBtn */


async function changeDisplay(tag, display, timeMs) {
    await new Promise(x => setTimeout(x, timeMs));
    tag.style.display = display;
    const id = tag.id ? `#${tag.id}` : '';
    return `${tag.tagName}${id} displayed as ${tag.style.display}`;
}  /* end of changeDisplay */
