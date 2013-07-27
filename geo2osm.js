// only Point, Polygon, MultiPolygon for now
// basic structure from:
// https://github.com/JasonSanford/GeoJSON-to-Google-Maps

// todo:
    // make changeset completely optional
var geo2osm = function(geo, changeset) {
    function togeojson(geo, properties) {
        var nodes = '',
            ways = '',
            relations = '';
        properties = properties || {};

        switch (geo.type) {
            case 'Point':
                nodes += '<node id="' + count + '" lat="' + geo.coordinates[1] +
                '" lon="' + geo.coordinates[0] + '">';
                nodes += propertiesToTags(properties);
                nodes += '</node>';
                count--;
                break;

            case 'MultiPoint':
                break;
            case 'LineString':
                break;
            case 'MultiLineString':
                break;
            case 'Polygon':
                append(polygon(geo, properties));
                break;

            case 'MultiPolygon':
                var extraRelations = '';
                relations += '<relation id="' + count + '" changeset="' + changeset + '">';
                properties['type'] = 'multipolygon';
                count--;

                for (var i = 0; i < geo.coordinates.length; i++){
                    // relations += '<member type="way" ref="' + count + '" role="outer"/>';

                    poly = polygon({
                        'coordinates': geo.coordinates[i]
                    });

                    console.log(poly['ids']);
                    for (var a = 0; a < poly['ids'].length; a++) {
                        relations += '<member type="way" ref="' + poly['ids'][a] + '" role="outer"/>';
                    }

                    nodes += poly['nodes'];
                    ways += poly['ways'];
                    extraRelations += poly['relations'];
                }

                relations += propertiesToTags(properties);
                relations += '</relation>';
                relations += extraRelations;
                break;

        }

        function append(obj) {
            nodes += obj['nodes'];
            ways += obj['ways'];
            relations += obj['relations'];
        }

        osm = '<osm version="0.6" generator="geo2osm.js">' + nodes + ways + relations + '</osm>';

        return {
            'nodes': nodes,
            'ways': ways,
            'relations': relations,
            'osm': osm
        };
    }

    function polygon(geo, properties) {
        var nodes = '',
            ways = '',
            relations = '',
            ids = [];
                // simple polygon way ids are kept for relation members
        properties = properties || {};

        if (geo.coordinates.length > 1) {
            // polygon with holes -> multipolygon
            relations += '<relation id="' + count + '" changeset="' + changeset +'">';
            count--;
            properties['type'] = 'multipolygon';

            for (var i = 0; i < geo.coordinates.length; i++) {
                var coords = [];

                relations += '<member type="way" ref="' + count + '" ';
                if (i === 0) {
                    relations += 'role="outer"/>';
                } else {
                    relations += 'role="inner"/>';
                }

                ways += '<way id="' + count + '" changeset="' + changeset + '">';
                count--;
                for (var a = 0; a < geo.coordinates[i].length-1; a++) {
                    coords.push([geo.coordinates[i][a][1], geo.coordinates[i][a][0]]);
                }
                coords = createNodes(coords, true);
                nodes += coords['nodes'];
                ways += coords['nds'];
                ways += '</way>';
            }

            relations += propertiesToTags(properties);
            relations += '</relation>';
        } else {
            // polygon -> way
            var coords = [];
            ways += '<way id="' + count + '" changeset="' + changeset + '">';
            ids.push(count);
            count--;
            for (var j = 0; j < geo.coordinates[0].length; j++) {
                coords.push([geo.coordinates[0][j][1], geo.coordinates[0][j][0]]);
            }
            coords = createNodes(coords, true);
            nodes += coords['nodes'];
            ways += coords['nds'];
            ways += propertiesToTags(properties);
            ways += '</way>';
        }

        return {
            'nodes': nodes,
            'ways': ways,
            'relations': relations,
            'ids': ids
        };
    }

    function propertiesToTags(properties) {
        var tags = '';
        for (var tag in properties) {
            tags += '<tag k="' + tag + '" v="' + properties[tag] + '"/>';
        }
        return tags;
    }

    function createNodes(coords, repeatLastND) {
        var nds = '',
            nodes = '',
            length = coords.length;
        repeatLastND = repeatLastND || false;
            // for polygons

        for (var a = 0; a < length; a++) {
            if (repeatLastND && a === 0) {
                repeatLastND = count;
            }

            nds += '<nd ref="' + count + '"/>';
            nodes += '<node id="' + count + '" lat="' + coords[a][0] +'" lon="' + coords[a][1] +
            '" changeset="' + changeset + '"/>';

            if (repeatLastND && a === length-1) {
                nds += '<nd ref="' + repeatLastND + '"/>';
            }
            count--;
        }
        return {'nds': nds, 'nodes': nodes};
    }

    var obj,
        count = -1;
    changeset = changeset || false;

    switch (geo.type) {
        case 'FeatureCollection':
            if (geo.features) {
                obj = [];
                for (var i = 0; i < geo.features.length; i++){
                    obj.push(togeojson(geo.features[i].geometry, geo.features[i].properties));
                }
            } else {
                console.log('Invalid GeoJSON object: FeatureCollection object missing \"features\" member.');
            }
            break;

        case 'GeometryCollection':
            if (geo.geometries) {
                obj = [];
                for (var j = 0; j < geo.geometries.length; j++){
                    obj.push(togeojson(geo.geometries[j]));
                }
            } else {
                console.log('Invalid GeoJSON object: GeometryCollection object missing \"geometries\" member.');
            }
            break;

        case 'Feature':
            if (geo.properties && geo.geometry) {
                obj = togeojson(geo.geometry, geo.properties);
            } else {
                console.log('Invalid GeoJSON object: Feature object missing \"properties\" or \"geometry\" member.');
            }
            break;

        case 'Point':
        case 'MultiPoint':
        case 'LineString':
        case 'MultiLineString':
        case 'Polygon':
        case 'MultiPolygon':
            if (geo.coordinates) {
                obj = togeojson(geo);
            } else {
                console.log('Invalid GeoJSON object: Geometry object missing \"coordinates\" member.');
            }
            break;

        default:
            console.log('Invalid GeoJSON object: GeoJSON object must be one of \"Point\", \"LineString\",' +
                '\"Polygon\", \"MultiPolygon\", \"Feature\", \"FeatureCollection\" or \"GeometryCollection\".');
    }

    return obj;
};
