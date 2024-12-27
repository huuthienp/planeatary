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
