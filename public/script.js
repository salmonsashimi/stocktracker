var switchLogin = function () {
    document.getElementById('registerCard').setAttribute('class', 'd-none');
    document.getElementById('loginCard').setAttribute('class', 'd-block');
    document.getElementById('loginButton').classList.add('active');
    document.getElementById('registerButton').classList.remove('active');

}

var switchRegister = function () {
    document.getElementById('loginCard').setAttribute('class', 'd-none');
    document.getElementById('registerCard').setAttribute('class', 'd-block');
    document.getElementById('registerButton').classList.add('active');
    document.getElementById('loginButton').classList.remove('active');

}

var passwordCheck = function () {
    if (document.getElementById('password').value == document.getElementById('password2').value) {
        document.getElementById('message').style.color = 'green';
        document.getElementById('message').innerHTML = 'Done!';
    } else {
        document.getElementById('message').style.color = 'red';
        document.getElementById('message').innerHTML = 'Password does not match.';
    }
}