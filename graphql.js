var token = ""

function login() {
    var Name = document.getElementById("login").value
    var Password = document.getElementById("password").value;
    console.log("Name", Name);

    var authorizationBasic = window.btoa(Name + ':' + Password);

    var request = new XMLHttpRequest();
    request.open('POST', "https://01.kood.tech/api/auth/signin", true);
    request.setRequestHeader('Authorization', 'Basic ' + authorizationBasic);
    request.send();

    request.onreadystatechange = function() {
        if (request.readyState === 4) {
            var response = JSON.parse(request.responseText);
            console.log("test", request.responseText);
            
            if (typeof response === "string") {
                console.log("response", response);
                token = response;
                getUserDetails();
            } else {
                alert(response.error);

            }
        }
    };
}


function getUserDetails() {
    var request = new XMLHttpRequest();
    request.open('POST', "https://01.kood.tech/api/graphql-engine/v1/graphql", true);
    request.setRequestHeader('Authorization', 'Bearer ' + token);
    
    var data = JSON.stringify({
        query: `{
            transaction(where: {type: {_eq: "xp"}}) {
                amount
                createdAt
                event {
                    path
                }
            }
        }`
    });
    request.send(data);

    request.onreadystatechange = function() {
        if (request.readyState === 4) {
            var response = JSON.parse(request.responseText);
            var transactions = response.data.transaction;
            var totalXP = 0;
            var xpData = transactions.map(t => {
                if (t.event.path === "/johvi/div-01") {
                    console.log(t.amount);
                    totalXP += t.amount;
                    return {
                        date: new Date(t.createdAt),
                        xp: totalXP
                    };
                }
            }).filter(Boolean);

            drawSVGGraph(xpData);
        }
    };
}

function drawSVGGraph(xpData) {
    xpData = xpData.filter(d => d.date.getFullYear() !== 2023);

    d3.select("#graph-container").html("");

    var width = 500;
    var height = 300;
    var padding = 50;

    var minDate = d3.min(xpData, d => d.date);
    var maxDate = d3.max(xpData, d => d.date);

    var xScale = d3.scaleTime()
                   .domain([minDate, maxDate])
                   .range([padding, width - padding]);

    var yScale = d3.scaleLinear()
                   .domain([0, d3.max(xpData, d => d.xp)])
                   .range([height - padding, padding]);

    xpData.forEach(d => {
        let month = d3.timeFormat("%m")(d.date);  
        console.log(`Month: ${month}, XP: ${d.xp}`);
    });

    var svg = d3.select("#graph-container")
                .append("svg")
                .attr("width", width)
                .attr("height", height);

    var line = d3.line()
                 .x(d => xScale(d.date))
                 .y(d => yScale(d.xp));

    svg.append("path")
       .datum(xpData)
       .attr("fill", "none")
       .attr("stroke", "blue")
       .attr("stroke-width", 2)
       .attr("d", line);

    svg.append("g")
       .attr("transform", `translate(0, ${height - padding})`)
       .call(d3.axisBottom(xScale).tickFormat(d3.timeFormat("%m")));

    svg.append("g")
       .attr("transform", `translate(${padding}, 0)`)
       .call(d3.axisLeft(yScale));
}
