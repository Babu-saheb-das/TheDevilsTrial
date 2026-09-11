function handleCredentialResponse(response) {
    // 1. JWT Token decode karna
    const responsePayload = parseJwt(response.credential);

    // 2. User profile details set karna
    document.getElementById("user-name").innerText = responsePayload.name;
    
    const userPic = document.getElementById("user-pic");
    userPic.src = responsePayload.picture;
    userPic.referrerPolicy = "no-referrer"; // Image block hone se bachayega
    userPic.style.display = "inline-block";

    // 3. Auth UI hide karke Game UI show karna
    document.getElementById("auth-section").style.display = "none";
    document.getElementById("game-section").style.display = "block";

    // 4. Devil Welcome Voice trigger karna
    speakDevil("Welcome " + responsePayload.name + "! Face your trial or burn!");

    // 5. Successful Login ke BAAD Level 1 Question Load karna
    loadQuestion(1);
}

function parseJwt(token) {
    try {
        var base64Url = token.split('.')[1];
        var base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        var jsonPayload = decodeURIComponent(window.atob(base64).split('').map(function(c) {
            return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
        }).join(''));
        return JSON.parse(jsonPayload);
    } catch (e) {
        console.error("JWT Parsing Error: ", e);
        return {};
    }
}