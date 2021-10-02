module.exports = (num) => {
    let int = (Math.round(num * 100) / 100).toFixed(2);
    let str = num.toLocaleString('en-US', { maximumFractionDigits: 2, minimumFractionDigits: 2 });
    return [int, str];
}