document.addEventListener('DOMContentLoaded', function(){
    const user = EH.getCurrentUser();
    const cta = document.getElementById('cta');
    if (!cta) return;
    if (user){
        cta.innerHTML = '<a href="./dashboard.html" class="btn btn-primary">Go to Dashboard</a>';
    } else {
        cta.innerHTML = '<a href="./signup.html" class="btn btn-primary">Get Started</a><a href="./login.html" class="btn btn-secondary">Login</a>';
    }
});


