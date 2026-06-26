const canvas = document.getElementById('stereonet');
const ctx = canvas.getContext('2d');
const width = canvas.width;
const height = canvas.height;
const cx = width / 2;
const cy = height / 2;
const R_max = (width / 2) - 20; // 20px padding

// The 5 stations from 24271505.P25
const stations = [
    { name: 'TWC', az: 248, toa: 167, polar: '+', desc: '憯葬 (Up)' },
    { name: 'ILA', az: 303, toa: 145, polar: '+', desc: '憯葬 (Up)' },
    { name: 'EOS2', az: 139, toa: 139, polar: '-', desc: '?刻 (Down)' },
    { name: 'EOS3', az: 143, toa: 125, polar: '-', desc: '?刻 (Down)' },
    { name: 'TWD', az: 224, toa: 99, polar: '+', desc: '憯葬 (Up)' }
];

let customStations = [];
let customStationCount = 1;

let activeStation = null;

function drawStereonetBase() {
    ctx.clearRect(0, 0, width, height);
    
    // Draw outer circle
    ctx.beginPath();
    ctx.arc(cx, cy, R_max, 0, 2 * Math.PI);
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#2f3542';
    ctx.stroke();

    // Draw Crosshairs
    ctx.beginPath();
    ctx.moveTo(cx, cy - R_max - 5);
    ctx.lineTo(cx, cy + R_max + 5);
    ctx.moveTo(cx - R_max - 5, cy);
    ctx.lineTo(cx + R_max + 5, cy);
    ctx.lineWidth = 1;
    ctx.strokeStyle = '#dfe4ea';
    ctx.stroke();

    // Labels
    ctx.font = '14px sans-serif';
    ctx.fillStyle = '#2f3542';
    ctx.textAlign = 'center';
    ctx.fillText('N', cx, cy - R_max - 8);
    ctx.fillText('S', cx, cy + R_max + 18);
    ctx.textAlign = 'right';
    ctx.fillText('W', cx - R_max - 8, cy + 4);
    ctx.textAlign = 'left';
    ctx.fillText('E', cx + R_max + 8, cy + 4);
}

// Convert TOA and AZ to X, Y using Equal Area Projection (Schmidt Net)
function getProjectedXY(az, toa) {
    let alpha = toa;
    let theta = az;
    
    // If upgoing ray (TOA > 90), project to lower hemisphere
    if (alpha > 90) {
        alpha = 180 - alpha;
        theta = (theta + 180) % 360;
    }

    // R = R_max * sqrt(2) * sin(alpha/2)
    const alphaRad = alpha * (Math.PI / 180);
    const R = R_max * Math.sqrt(2) * Math.sin(alphaRad / 2);

    const thetaRad = theta * (Math.PI / 180);
    
    // North is top (Y is -), East is right (X is +)
    const x = cx + R * Math.sin(thetaRad);
    const y = cy - R * Math.cos(thetaRad);

    return { x, y };
}

function drawStations() {
    const allStations = [...stations, ...customStations];
    allStations.forEach(st => {
        const { x, y } = getProjectedXY(st.az, st.toa);
        
        ctx.beginPath();
        ctx.arc(x, y, 6, 0, 2 * Math.PI);
        
        if (st.polar === '+') {
            ctx.fillStyle = '#ff4757'; // Red for compression
            ctx.fill();
            ctx.lineWidth = 1;
            ctx.strokeStyle = '#2f3542';
            ctx.stroke();
        } else {
            ctx.fillStyle = '#ffffff'; // White for dilatation
            ctx.fill();
            ctx.lineWidth = 2;
            ctx.strokeStyle = '#2b5cff'; // Blue for dilatation outline
            ctx.stroke();
        }

        // Draw highlight if active
        if (activeStation === st.name) {
            ctx.beginPath();
            ctx.arc(x, y, 12, 0, 2 * Math.PI);
            ctx.lineWidth = 2;
            ctx.strokeStyle = '#f1c40f'; // yellow highlight
            ctx.stroke();
        }

        // Label
        ctx.fillStyle = '#2f3542';
        ctx.font = '11px sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText(st.name, x + 10, y + 4);
    });
}

let calculatedPlanes = false;

function drawSimulatedNodalPlanes() {
    ctx.save();
    ctx.beginPath();
    // Simulate nodal plane 1
    ctx.arc(cx - 40, cy, R_max, -Math.PI/2 + 0.25, Math.PI/2 - 0.25);
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#ff4757';
    ctx.setLineDash([5, 5]);
    ctx.stroke();

    ctx.beginPath();
    // Simulate nodal plane 2
    ctx.arc(cx + 40, cy, R_max, Math.PI/2 + 0.25, 3*Math.PI/2 - 0.25);
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#2b5cff';
    ctx.stroke();
    ctx.restore();
}

function render() {
    drawStereonetBase();
    if (calculatedPlanes) {
        drawSimulatedNodalPlanes();
    }
    drawStations();
}

// Setup Interaction
const listContainer = document.getElementById('station-list');

function addStationToDOM(st, isCustom) {
    const li = document.createElement('li');
    li.className = 'station-item';
    if (isCustom) li.classList.add('custom-station');
    li.innerHTML = `
        <div><strong>${st.name}</strong> <span style="font-size:0.85rem; color:#747d8c; margin-left:10px;">Az: ${st.az}簞, Toa: ${st.toa}簞</span></div>
        <div style="font-weight:bold; color: ${st.polar === '+' ? 'var(--accent-color)' : 'var(--primary-color)'}">${st.polar === '+' ? '??憯葬' : '???刻'}</div>
    `;
    
    li.addEventListener('mouseenter', () => {
        activeStation = st.name;
        document.querySelectorAll('.station-item').forEach(el => el.classList.remove('active'));
        li.classList.add('active');
        render();
    });
    li.addEventListener('mouseleave', () => {
        activeStation = null;
        li.classList.remove('active');
        render();
    });
    
    listContainer.appendChild(li);
}

// Initial default stations
stations.forEach(st => addStationToDOM(st, false));

// Custom Form Logic
document.getElementById('add-point-btn').addEventListener('click', () => {
    let name = document.getElementById('custom-name').value.trim();
    let az = parseInt(document.getElementById('custom-az').value);
    let toa = parseInt(document.getElementById('custom-toa').value);
    let polar = document.getElementById('custom-polar').value;

    if (isNaN(az) || isNaN(toa)) {
        alert("隢撓?交????嫣?閫??箏?閫?");
        return;
    }
    if (az < 0 || az > 360) {
        alert("?嫣?閫?? 0 ??360 摨虫???");
        return;
    }
    if (toa < 0 || toa > 180) {
        alert("?箏?閫?? 0 ??180 摨虫???");
        return;
    }

    if (!name) {
        name = "C" + customStationCount;
        customStationCount++;
    }

    const newSt = { name, az, toa, polar, desc: polar === '+' ? '憯葬 (Up)' : '?刻 (Down)' };
    customStations.push(newSt);
    addStationToDOM(newSt, true);
    calculatedPlanes = false;
    render();

    // clear inputs
    document.getElementById('custom-name').value = '';
    document.getElementById('custom-az').value = '';
    document.getElementById('custom-toa').value = '';
});

document.getElementById('clear-points-btn').addEventListener('click', () => {
    customStations = [];
    customStationCount = 1;
    document.querySelectorAll('.custom-station').forEach(el => el.remove());
    calculatedPlanes = false;
    render();
});


// Theme toggle
const themeBtn = document.getElementById('theme-btn');
themeBtn.addEventListener('click', () => {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', newTheme);
});

render();

document.getElementById('calc-mechanism-btn').addEventListener('click', () => {
    const totalPoints = stations.length + customStations.length;
    
    if (totalPoints < 8) {
        alert('?? 霅血?嚗葫蝡??銝雲嚗n\n?桀??? ' + totalPoints + ' ?葫蝡??撖阡??圈?摮貉?皜砌葉嚗?撠?皜祉???嚗陘?嗆?葉?典銝鞊⊿?嚗??⊥??嗆??箏銝??皞??嗉圾?n\n撱箄降嚗?頛詨?游?????葫蝡????虜?喳??閬?8-15 ??雿?嚗??賣蝞祕??蝭?ｇ?');
        calculatedPlanes = false;
        render();
    } else {
        alert('??璅⊥閮???嚗n\n撌脫???' + totalPoints + ' ?葫蝡??脰???嚗蝞?雿喲????璈閫?郭?ｇ?蝭?ｇ?嚗n(??撌脩鼓鋆賢璅⊥??????');
        calculatedPlanes = true;
        render();
    }
});

