# Etapa de compilación
FROM mcr.microsoft.com/dotnet/sdk:9.0 AS build
WORKDIR /src

COPY ["BACKEND.csproj", "./"]
RUN dotnet restore "BACKEND.csproj"

COPY . .
RUN dotnet publish "BACKEND.csproj" \
    -c Release \
    -o /app/publish \
    --no-restore

# Etapa de ejecución
FROM mcr.microsoft.com/dotnet/aspnet:9.0 AS final
WORKDIR /app

COPY --from=build /app/publish .

# Railway entrega el puerto mediante la variable PORT.
# ASP.NET Core escuchará en ese puerto.
ENTRYPOINT ["sh", "-c", "ASPNETCORE_URLS=http://0.0.0.0:${PORT:-8080} dotnet BACKEND.dll"]