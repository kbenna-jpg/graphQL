import { basicUserInfo } from "./queries.js"; 

// Makes API call using the query and displays user information
function getUserDetails() {
    var token = localStorage.getItem('authToken'); 
    if (!token) {
        alert('No token found. Please log in again.');
        window.location.href = "index.html";
        return;
    }
    fetch("https://01.kood.tech/api/graphql-engine/v1/graphql", {
        method: "POST",
        body: basicUserInfo,
        headers: {
          "Content-Type": "application/json",
          "Authorization": "Bearer " + token 
        },
      })
        .then((response) => response.json())
        .then((data) => {
          const user = data.data.user;
          console.log("user firstname:", user[0].firstName)
          document.getElementById("user-id").textContent = `ID: ${user[0].id}`;
          document.getElementById("user-campus").textContent = `Campus: ${user[0].campus}`;
          document.getElementById("user-firstName").textContent = `First name: ${user[0].firstName}`;
          document.getElementById("user-lastName").textContent = `Last name: ${user[0].lastName}`;
          document.getElementById("user-email").textContent = `Email: ${user[0].email}`;
          document.getElementById("user-nationality").textContent = `Nationality: ${user[0].attrs.nationality}`;
          console.log(user)

          document.getElementById("user-login").textContent = user[0].login;


        })
        .catch((error) => console.error(error));    
}

// Retrieves user XP for the graph data
function getUserXP() {
    var token = localStorage.getItem('authToken'); 
    if (!token) {
        alert('No token found. Please log in again.');
        window.location.href = "index.html";
        return;
    }
    var request = new XMLHttpRequest();
    request.open('POST', "https://01.kood.tech/api/graphql-engine/v1/graphql", true);
    request.setRequestHeader('Authorization', 'Bearer ' + token);
    var data = JSON.stringify({
        query: `{
            transaction(where: {type: {_eq: "xp"}}) {
                amount
                createdAt
                object {
                    id
                    name
                    type
                }
                event {
                    path
                }
            }
        }`
    });
    request.send(data);
    request.onreadystatechange = function () {
        if (request.readyState === 4) {
            var response = JSON.parse(request.responseText);
            console.log(response);
            if (!response.data || !response.data.transaction) {
                alert('Failed to retrieve data.');
                return;
            }
            
            var transactions = response.data.transaction;
            var taskXP = {};
            var xpDataForLineGraph = [];

            transactions.forEach(t => {
                if (t.event.path === "/johvi/div-01") {
                    // For the pie chart
                    if (!taskXP[t.object.name]) {
                        taskXP[t.object.name] = 0;
                    }
                    taskXP[t.object.name] += t.amount;

                    // For the line graph
                    xpDataForLineGraph.push({
                        date: new Date(t.createdAt),
                        xp: t.amount // or totalXP += t.amount if you want cumulative XP over time
                    });
                }
            });

            // Convert taskXP object into an array of objects for the pie chart
            var xpDataForPieChart = Object.keys(taskXP).map(task => {
                return { task: task, xp: taskXP[task] };
            });

            drawSVGGraph(xpDataForLineGraph); // Pass the date-based data to the line graph
            drawPieChart(xpDataForPieChart); // Pass the task-based data to the pie chart
        }
    };
}


function drawSVGGraph(xpData) {
    var startDate = new Date(2023, 9, 1);  // Months are 0-based, so October is 9
    var currentDate = new Date();
    var allMonths = [];
    var date = new Date(startDate);

    while (date <= currentDate) {
        allMonths.push(new Date(date));  
        date.setMonth(date.getMonth() + 1);  
    }

    // Create a map of months to XP data
    var xpMap = new Map();
    xpData.forEach(d => xpMap.set(d.date.toISOString().slice(0, 7), d.xp));

    // Fill in missing months with zero XP and calculate cumulative XP
    var filledData = allMonths.reduce((acc, curr) => {
        var key = curr.toISOString().slice(0, 7);
        var prevXP = acc.length > 0 ? acc[acc.length - 1].xp : 0;
        acc.push({
            date: curr,
            xp: xpMap.has(key) ? prevXP + xpMap.get(key) : prevXP
        });
        return acc;
    }, []);

    // Clears any existing SVG
    d3.select("#graph-container").html("");

    var width = 800;
    var height = 400;
    var margin = { top: 20, right: 20, bottom: 50, left: 70 };

    var minDate = d3.min(filledData, d => d.date);
    var maxDate = d3.max(filledData, d => d.date);

    var xScale = d3.scaleTime()
        .domain([minDate, maxDate])
        .range([margin.left, width - margin.right]);

    var yScale = d3.scaleLinear()
        .domain([0, d3.max(filledData, d => d.xp)])  // Maintain for line upper limit
        .range([height - margin.bottom, margin.top]);

    // Create SVG element and appends to the graph container
    var svg = d3.select("#graph-container")
        .append("svg")
        .attr("width", width)
        .attr("height", height)
        .style("background", "yellowgreen");  

    // Creates line generator 
    var line = d3.line()
        .x(d => xScale(d.date))
        .y(d => yScale(d.xp));

    svg.append("path")
        .datum(filledData)
        .attr("fill", "none")
        .attr("stroke", "white") 
        .attr("stroke-width", 2)
        .attr("d", line);

    svg.append("g")
        .attr("transform", `translate(0, ${height - margin.bottom})`)
        .call(d3.axisBottom(xScale).tickFormat(d3.timeFormat("%b %Y")))
        .attr("class", "x-axis")
        .style("font-size", "12px")
        .style("color", "white")  
        .selectAll("text")
        .attr("transform", "rotate(-45)") 
        .style("text-anchor", "end");

    // Add the Y Axis (XP)
    svg.append("g")
        .attr("transform", `translate(${margin.left}, 0)`)
        .call(d3.axisLeft(yScale))
        .attr("class", "y-axis")
        .style("font-size", "12px")
        .style("color", "white");  

    // Add the Y-axis label
    svg.append("text")
        .attr("x", -height / 2)
        .attr("y", margin.left / 2.5)
        .attr("transform", "rotate(-90)")
        .attr("text-anchor", "middle")
        .style("fill", "white") 
        .text("XP");

    // Create a tooltip div that shows XP value on hover
    var tooltip = d3.select("body").append("div")
        .attr("class", "tooltip")
        .style("position", "absolute")
        .style("background-color", "white")
        .style("border", "solid 1px black")
        .style("padding", "8px")
        .style("border-radius", "5px")
        .style("opacity", 0);  

    svg.selectAll(".dot")
        .data(filledData)
        .enter()
        .append("circle")
        .attr("class", "dot")
        .attr("cx", d => xScale(d.date))
        .attr("cy", d => yScale(d.xp))
        .attr("r", 4)
        .attr("fill", "red")  
        .on("mouseover", function(event, d) {
            d3.select(this).attr("r", 6);  

            tooltip.transition()
                .duration(200)
                .style("opacity", 1);

            tooltip.html(`XP: ${d.xp} <br/> Date: ${d3.timeFormat("%b %Y")(d.date)}`)
                .style("left", (event.pageX + 10) + "px")  
                .style("top", (event.pageY - 28) + "px");
        })
        .on("mouseout", function() {
            d3.select(this).attr("r", 4); 

            tooltip.transition()
                .duration(500)
                .style("opacity", 0);  
        });
}
function drawPieChart(xpData) {
    d3.select("#piechart-container").html("");
    var width = 400;
    var height = 400;
    var radius = Math.min(width, height) / 2;

    var svg = d3.select("#piechart-container")
                .append("svg")
                .attr("width", width)
                .attr("height", height)
                .append("g")
                .attr("transform", `translate(${width / 2}, ${height / 2})`);
    var pie = d3.pie()
                .value(d => d.xp);
    var arc = d3.arc()
                .outerRadius(radius - 10)
                .innerRadius(0);
    var g = svg.selectAll(".arc")
               .data(pie(xpData))
               .enter()
               .append("g")
               .attr("class", "arc");
    g.append("path")
     .attr("d", arc)
     .attr("fill", (d, i) => d3.schemeCategory10[i]);

     var tooltip = d3.select("#piechart-container")
                    .append("div")
                    .attr("class", "tooltip")
                    .style("position", "absolute")
                    .style("background-color", "black")
                    .style("color", "white")
                    .style("padding", "10px")
                    .style("border-radius", "5px")
                    .style("font-size", "14px")  
                    .style("visibility", "hidden");


    g.on("mouseover", function(event, d) {
        tooltip.style("visibility", "visible")
               .text(`${d.data.task}: ${d.data.xp} XP (${((d.data.xp / d3.sum(xpData, d => d.xp)) * 100).toFixed(2)}%)`);
    })
    .on("mousemove", function(event) {
        tooltip.style("top", (event.pageY - 20) + "px")
               .style("left", (event.pageX + 20) + "px");
    })
    .on("mouseout", function() {
        tooltip.style("visibility", "hidden");
    });
}

// Fetches user details and draw the graph
getUserDetails();
getUserXP();
