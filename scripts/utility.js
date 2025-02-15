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

export function showElement(el) {
    el.classList.remove("hidden");
  }
  
  export function hideElement(el) {
    el.classList.add("hidden");
  }

export function showSpinner(el, condition) {
    //console.log("Showing spinner...");
    showElement(el)
    condition[0] = true;
    condition[1] = Date.now();
};

export function hideSpinner(el, condition) {
    const elapsedTime = Date.now() - condition[1];
    const minDisplayTime = 3000; 
    if (elapsedTime < minDisplayTime) {
        setTimeout(() => {
            //console.log("Hiding spinner after min time...");
            el.classList.add('hidden');
            condition[0] = false;
        }, minDisplayTime - elapsedTime);
        el.classList.add('hidden');
        condition[0] = false;
    } else {
        el.classList.add('hidden');
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