let value = document.currentScript.getAttribute('value');
let cost = document.currentScript.getAttribute('cost');

const data = {
    labels: ['Value', 'Cost'],
    datasets: [{
        data: [value, cost],
        backgroundColor: [
            'rgba(75, 192, 192, 0.2)',

            'rgba(255, 99, 132, 0.2)',
        ],
        borderColor: [
            'rgb(75, 192, 192)',

            'rgb(255, 99, 132)',
        ],
        borderWidth: 1,
        maxBarThickness: 100,
    }]
};

const config = {
    type: 'bar',
    data: data,
    options: {
        plugins: {
            legend: {
                display: false
            }
        },
        indexAxis: 'y',
        scales: {
            x: {
                display: false,
            },
            y: {
                display: false,
            }
        }
    },
};

var myChart = new Chart(
    document.getElementById('myChart'),
    config
);