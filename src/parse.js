const {range} = require("./utils");

const CORNERS_CHARS = /[+┌┐└┘╔╗╚╝]/

function parse(decl){
	const
		rows = getRows(decl.value),
		cols = getCols({ rows }),
		{ colIndexes, rowIndexes } = getCorners({ rows }),
		zones = getZones({ rows, cols, colIndexes, rowIndexes });

	return {
		decl, rows, cols, zones, rowIndexes, colIndexes
	};
}

function getRows(str){
	return str.match(/".*"/g).map(row => row.slice(1, row.length - 1));
}

function getCols({ rows }){
	let colsLength = rows.reduce((min, row) => row.length < min ? row.length : min, Math.pow(2,31)-1);
	return range(0, colsLength).map(x => rows.map(row => row[x]).join(''));
}

function getCorners({ rows }){
	let colIndexes = new Set,
	    rowIndexes = new Set;
	rows.forEach((row, rowIndex) => {
		row.split('').forEach((char, colIndex) => {
			if(CORNERS_CHARS.test(char)){
				colIndexes.add(colIndex);
				rowIndexes.add(rowIndex);
			}
		});
	});

	colIndexes = Array.from(colIndexes).sort((a,b)=>a-b)
	rowIndexes = Array.from(rowIndexes).sort((a,b)=>a-b)

	return { colIndexes, rowIndexes };
}

function getZones({ rows, cols, colIndexes, rowIndexes }){
	const zones = [];

	for(let y=0; y<rowIndexes.length; y+=2){
		for(let x=0; x<colIndexes.length; x+=2){
			let top = rowIndexes[y],
			    left = colIndexes[x],
			    zone = { top, left };

			if(!isInZone({ zones, x:left, y:top }) && (x+1) in colIndexes && (y+1) in rowIndexes){

				let bottom, right;

				if(CORNERS_CHARS.test(rows[top][left])) {
					// a zone starts here, see how far if goes
					bottom = cols[left].slice(top+1).search(CORNERS_CHARS)+top+1;
					right = rows[top].slice(left+1).search(CORNERS_CHARS)+left+1;
				} else {
					zone.isHole = true; // no zone found, presumed as hole
					bottom = rowIndexes[y+1];
					right = colIndexes[x+1];
				}

				zone.bottom = bottom;
				zone.right = right;
				zone.content = rows
					.slice(top+1, bottom)
					.map(row => row.substring(left+1, right))
					.join(" ");
				zone.selector = getZoneSelector(zone) || null;
				zone.name = getZoneName({ zone, zones });

				zones.push(zone);
			}
		}
	}

	return zones;
}

function getZoneSelector(zone){
	return zone.content
		.replace(/[^\w]v[^\w]|[^\w#.:\-\[\]()]/g, "")
		.replace(/^:(\d+)$/, "*:nth-child($1)") // :2 => *:nth-child(2)
		.replace(/(^[\w-]+):(\d+)$/, "$1:nth-of-type($2)") // button:1 => button:nth-of-type(1)
}

function getZoneName({ zone, zones }){
	if(!zone.selector) return null;

	const zoneNames = new Set(zones.map(z => z.name)),
	      zoneSelectors = new Set(zones.map(z => z.selector)),
	      zoneNamesBySelector = new Map([...zoneSelectors].map(
		      selector => [selector, zones.find(z => z.selector === selector).name]
	      ));

	if(zoneNamesBySelector.has(zone.selector)) {
		return zoneNamesBySelector.get(zone.selector)
	}

	let baseName = zone.selector
		.replace(/(\w)([#.\[])/g, "$1_") // .foo#bar.baz[qux] => .foo_bar_baz_qux]
		.replace(/[^\w]/g, ""); // .foo_bar_baz_qux] => foo_baz_baz_qux

	let aliasNum = 1,
	    name = baseName;

	while(zoneNames.has(name) ){
		name = baseName + aliasNum;
		aliasNum++;
	}

	zoneNames.add(name);
	zoneNamesBySelector.set(zone.selector, name);
	return name;
}

function isInZone({ zones, x, y }){
	return zones.some(zone => x >= zone.left && x <= zone.right && y >= zone.top && y <= zone.bottom);
}

module.exports = { parse, getRows, getCols, getCorners, getZones, getZoneName, isInZone };