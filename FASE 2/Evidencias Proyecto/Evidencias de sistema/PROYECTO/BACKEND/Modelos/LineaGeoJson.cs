using MongoDB.Bson.Serialization.Attributes;

namespace BACKEND.Modelos
{
    /// <summary>
    /// GeoJSON LineString. Cada posición en <c>coordinates</c> es [longitud, latitud].
    /// Los nombres <c>type</c> y <c>coordinates</c> se mantienen en inglés según el estándar.
    /// </summary>
    [BsonIgnoreExtraElements]
    public class LineaGeoJson
    {
        [BsonElement("type")]
        public string Type { get; set; } = "LineString";

        [BsonElement("coordinates")]
        public List<double[]> Coordinates { get; set; } = new();
    }
}
