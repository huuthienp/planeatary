async function confirmUser(identt, fragment) {  // not used
    if (fragment === null) {
        console.warn('Token is missing in attempt to confirm signup.');
        return null;
    }
    const token = fragment.value;
    try {
        const response = await identt.confirm(token, true);
        netlifyIdentity.open();
        return response;
    }
    catch(e) {
        console.error(e);
        netlifyIdentity.open();
        showFlashMessage('Email could not be confirmed.');
        return null;
    }
}
export function checkFragment(name) {
    let fragment = {};
    const _split = window.location.hash.substring(1).split('=');
    const exists = name === _split[0];
    if (exists) {
        fragment.name = name;
        fragment.value = _split[1] || '';
        return fragment;
    } else {
        return null;
    }
}
function showFlashMessage(message) {  // not used
    const flashMessage = document.querySelector('div.modalContent div.flashMessage');
    if (flashMessage === null) {
        const container = document.createElement('div');
        const header = document.querySelector('div.modalContent div.header') || document.querySelector('body');
        container.classList.add('flashMessage', 'error');
        container.textContent = message;
        header.insertAdjacentHTML('afterEnd', container.outerHTML);
    } else {
        flashMessage.textContent = message;
    }
    return;
}
