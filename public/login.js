var switchLogin = () => {
    document.getElementById('registerCard').setAttribute('class', 'd-none');
    document.getElementById('loginCard').setAttribute('class', 'd-block');
    document.getElementById('loginTab').classList.add('active');
    document.getElementById('registerTab').classList.remove('active');
}

var switchRegister = () => {
    document.getElementById('loginCard').setAttribute('class', 'd-none');
    document.getElementById('registerCard').setAttribute('class', 'd-block');
    document.getElementById('registerTab').classList.add('active');
    document.getElementById('loginTab').classList.remove('active');
    document.getElementById('registerButton').classList.add('disabled');

}

var passwordCheck = () => {
    if (document.getElementById('password').value == document.getElementById('password2').value) {
        document.getElementById('message').style.color = 'green';
        document.getElementById('message').innerHTML = 'Password Matched!';
        document.getElementById('registerButton').classList.remove('disabled');
    } else {
        document.getElementById('message').style.color = 'red';
        document.getElementById('message').innerHTML = 'Password does not match.';
        document.getElementById('registerButton').classList.add('disabled');
    }
}