export function handleOffcanvasClick(event) {
    event.preventDefault(); // Prevent default link behavior
    const targetLink = event.currentTarget;
    const targetHref = targetLink.getAttribute('href');
    const offcanvasNavbar = document.getElementById('offcanvasNavbar');
  
    // Hide offcanvas
    const offcanvas = new bootstrap.Offcanvas(offcanvasNavbar);
    offcanvas.hide();
  
    // Navigate if href exists
    if (targetHref && targetHref !== "#") {
      window.location.href = targetHref;
    }
  }

export function handleOffcanvasClickFromElement(linkElement) {
    // Get the href attribute from the element
    const targetHref = linkElement.getAttribute('href');
    const offcanvasNavbar = document.getElementById('offcanvasNavbar');
    
    const offcanvas = new bootstrap.Offcanvas(offcanvasNavbar);
    offcanvas.hide();
    
    if (targetHref && targetHref !== "#") {
        window.location.href = targetHref;
    }
}

export function showElement(el) {
    el.forEach(element => {element.classList.remove("hidden")})
    
  }
  
  export function hideElement(el) {
    el.forEach(element => {element.classList.add("hidden")})
  }

export function showSpinner(elements, condition) {
    console.log("Showing spinner...");
    showElement(elements)
    condition[0] = true;
};

export function hideSpinner(elements, condition) {
    const elapsedTime = Date.now() - condition[1];
    const minDisplayTime = 3000; 
    if (elapsedTime < minDisplayTime) {
        setTimeout(() => {
            console.log("Hiding spinner after min time...");
            hideElement(elements);
            condition[0] = false;
        }, minDisplayTime - elapsedTime);
    } else {
        hideElement(elements);
        condition[0] = false;
    }
}

export function isTokenExpired(token) {
    if (!token) return true;
    
    const base64Payload = token.split('.')[1]; 
    const decodedPayload = JSON.parse(atob(base64Payload));
    const exp = decodedPayload.exp; 
    
    // Compare current time with expiration time
    const now = Math.floor(Date.now()/1000); 
    return exp < now; // Returns true if token is expired
}


export function detectAndParseTimestamp(ts) {
    const length = String(ts).length;
    
    if (length <= 10) {
        // 10 digits => seconds
        return new Date(ts * 1000);
    } else if (length === 13) {
        // 13 digits => milliseconds
        return new Date(ts);
    } else {
        const asMillis = new Date(ts);
        return asMillis; 
    }
}

export async function getUserData() {
    const user = netlifyIdentity.gotrue.currentUser();
    if (!user) return null;
    
    try {
        const token = await user.jwt();
        if (isTokenExpired(token)) {
            console.log("Token expired. Prompting user to re-login...");
            netlifyIdentity.logout();
            return null;
        } else {
            console.log("Token is valid.");
            const metadata = user.user_metadata;
            const responseHistory = metadata.responseHistory;
            const userId = user.id;
            return { metadata, responseHistory, userId };
        }
    } catch (error) {
        console.error("Error fetching token:", error);
        return null;
    }
}

export function hasPostQuizResult() {
    // Assuming 'postResult' is the key in localStorage that holds the result.
    return localStorage.getItem('postResult') !== null;
}

export function hasPostQuizCycle() {
    // Assuming 'postResult' is the key in localStorage that holds the result.
    return sessionStorage.getItem('selectedCycle_post') !== null;
}

export function emptyStateDisplay(frame, content, img) {
    frame.innerHTML = `<div class="void">
    <p class="placeholder-glow  w-50">
    <span class="placeholder w-40"></span>
    <span class="placeholder w-55"></span>
    <span class="placeholder w-100"></span>
    <img src="..." alt="..." class="myGif" style="display: none;" />
    </p>
    <p class="placeholder-glow w-100">
    <span class="placeholder w-100"></span>
    </p>
    </div>`
    // If the image is already loaded (from cache, for example), show it immediately.
    const gifEl = frame.querySelector('.myGif');
    if (gifEl.complete) {
        frame.innerHTML = `<div class="void">${content} <img class="myGif" src="${img}" style="display: block;"></div>`;
    } else {
        // Otherwise, add an event listener to detect when it finishes loading.
        gifEl.addEventListener('load', () => {
            frame.innerHTML = `<div class="void">${content} <img class="myGif" src="${img}" style="display: block;"></div>`;
        });
    }
}

export async function logOut() {
    const offcanvas = new bootstrap.Offcanvas(offcanvasNavbar);
    
    if (netlifyIdentity.gotrue.currentUser() !== null) {
        let user = netlifyIdentity.gotrue.currentUser();
        const logoutResult = await user.logout();
        offcanvas.hide();
        sessionStorage.removeItem('selectedCycle');
        console.log('User has been logged out!');
        window.location.href = "index.html";
    } else {
        window.location.href = "index.html";
        console.log("No user is logged in!");
    }
}