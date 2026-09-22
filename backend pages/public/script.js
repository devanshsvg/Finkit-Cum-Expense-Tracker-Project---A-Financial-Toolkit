const expenses = JSON.parse(document.getElementById('graph-data').textContent || '[]');

let labels=expenses.map(item=>item.category);
let values=expenses.map(item=>Number(item.total_expense));


const ctx=document.getElementById('myChart');
new Chart(ctx,{
    type:'pie',
    data:{
        labels:labels,
        datasets:[{
            data:values
        }]
    }
});
