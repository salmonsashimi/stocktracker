var linkTo = (ticker) => {
    window.location.href = "/ticker/" + ticker;
}

let tds = document.getElementsByTagName('td');
for (let td of tds) {
    td.style.cursor = 'pointer';
};
