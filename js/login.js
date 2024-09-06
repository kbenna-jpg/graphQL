var token = "";
function login() {
    var Name = document.getElementById("login").value;
    var Password = document.getElementById("password").value;
    console.log("Name", Name);
    var authorizationBasic = window.btoa(Name + ':' + Password);
    var request = new XMLHttpRequest();
    request.open('POST', "https://01.kood.tech/api/auth/signin", true);
    request.setRequestHeader('Authorization', 'Basic ' + authorizationBasic);
    request.send();
    request.onreadystatechange = function () {
        if (request.readyState === 4) {
            var response = JSON.parse(request.responseText);
            console.log("test", request.responseText);
            if (typeof response === "string") {
                console.log("response", response);
                token = response;
                // Store the token in localStorage
                localStorage.setItem('authToken', token);
                // Redirect to mainpage
                window.location.href = "mainpage.html";
            } else {
                alert(response.error);
            }
        }
    };
}

function logout() {
    localStorage.removeItem('authToken');
    console.log("Logged out");
    window.location.href = "index.html";
}