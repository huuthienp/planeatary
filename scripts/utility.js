export function handleOffcanvasClick(event) {
    event.preventDefault(); // Prevent default link behavior
    const targetLink = event.currentTarget;
    const targetHref = targetLink.getAttribute('href');
    const offcanvasNavbar = document.getElementById('offcanvasNavbar');
  
    // Hide offcanvas
    const offcanvasInstance = bootstrap.Offcanvas.getInstance(offcanvasNavbar) || new bootstrap.Offcanvas(offcanvasNavbar);

    // Navigate if href exists
    if (targetHref && targetHref !== "#") {
        offcanvasInstance.hide();
        window.location.href = targetHref;
    }
  }

export function handleOffcanvasClickFromElement(linkElement) {
    // Get the href attribute from the element
    const targetHref = linkElement.getAttribute('href');
    const offcanvasNavbar = document.getElementById('offcanvasNavbar');
    
    const offcanvasInstance = bootstrap.Offcanvas.getInstance(offcanvasNavbar) || new bootstrap.Offcanvas(offcanvasNavbar);
    
    if (targetHref && targetHref !== "#") {
        offcanvasInstance.hide();
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

export async function checkAndRefreshTokenExpired() {
    const user = netlifyIdentity.gotrue.currentUser();
    if (!user) return null;
    else if (user) {
        user.jwt().then(token => {
            if (isTokenExpired(token)) {
                console.log("Token expired. Prompting user to re-login...");
                netlifyIdentity.logout();
                window.location.href = "index.html";
            } else {
                console.log("Token is valid.");
            }
        });
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

export function checkBackgroundLoaded(url) {
    const img = new Image();
    img.src = url;
    if (img.complete) {
      // The image has already been loaded (from cache, for instance)
      console.log("background is complete (loaded)");
      return true;
    } else {
      img.onload = () => { console.log("Image has finished loading!"); };
      img.onerror = () => { console.log("Error loading image."); };
      return false;
    }
  }
  

export function emptyStateDisplay(frame, content1, content2, img) {
    frame.innerHTML = `<div class="void">
    <p class="placeholder-glow title-placeholder">
    <span class="placeholder w-100"></span>
    </p>
    <p class="placeholder-glow text-placeholder">
    <span class="placeholder w-100"></span>
    <span class="placeholder w-100"></span>
    <span class="placeholder w-100"></span>
    </p>
    <img src="" alt="..." class="myGif1" style="display: none;" />
    <img src="" alt="..." class="myGif2" style="display: none;" />
    </div>`;
    // If the image is already loaded (from cache, for example), show it immediately.
    const background = frame.querySelector('.void');
    const gifEl1 = frame.querySelector('.myGif1');
    const gifEl2 = frame.querySelector('.myGif2');
    background.style.backgroundImage = "url('./images/ella-olsson-food.jpg')";
    gifEl1.src = img;
    gifEl2.src = "./images/PlanEATary_Logo_Badge.png";
    //Checking loading completion of backgground image 
    const bgImage = window.getComputedStyle(background).backgroundImage;
    if (bgImage) {
        checkBackgroundLoaded(bgImage);
    }
    //Checking loading completion of image and gif image
    if (gifEl1.complete && gifEl2.complete) {
        frame.innerHTML = "";
        frame.innerHTML = `<div class="void"><div class='void-header'><img class="myGif2" src="./images/PlanEATary_Logo_Badge.png" style="display: block; width: 100px;"><br /><span>${content1}<span></div><div class='void-content'>${content2}</div><img class="myGif1" src="${img}" style="display: block;"></div>`;
    } else {
        gifEl1.style.display = "none";
        gifEl2.style.display = "none";
    }
     // Otherwise, add an event listener to detect when it finishes loading.
     gifEl1.addEventListener('load', () => {
        frame.innerHTML= "";
        frame.innerHTML = `<div class="void"><div class='void-header'><img class="myGif2" src="./images/PlanEATary_Logo_Badge.png" style="display: block; width: 100px;"><br /><span>${content1}<span></div><div class='void-content'>${content2}</div><img class="myGif1" src="${img}" style="display: block;"></div>`;
    });
}

export async function logOut() {
    if (netlifyIdentity.gotrue.currentUser() !== null) {
        const offcanvasNavbar = document.getElementById('offcanvasNavbar');
        const offcanvas = new bootstrap.Offcanvas(offcanvasNavbar);
        offcanvas.hide();
        let user = netlifyIdentity.gotrue.currentUser();
        const logoutResult = await user.logout();
        sessionStorage.removeItem('selectedCycle');
        console.log('User has been logged out!');
        window.location.href = "index.html";
    } else {
        window.location.href = "index.html";
        console.log("No user is logged in!");
    }
}