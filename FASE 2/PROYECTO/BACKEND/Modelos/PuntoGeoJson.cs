using MongoDB.Bson.Serialization.Attributes;

namespace BACKEND.Modelos
{
    /// <summary>
    /// GeoJSON Point. El orden de <c>coordinates</c> es longitud, latitud.
    /// Los nombres <c>type</c> y <c>coordinates</c> se mantienen en inglés según el estándar.
    /// </summary>
    [BsonIgnoreExtraElements]
    public class PuntoGeoJson
    {
        [BsonElement("type")]
        public string Type { get; set; } = "Point";

        [BsonElement("coordinates")]
        public double[] Coordinates { get; set; } = Array.Empty<double>();
    }
}
