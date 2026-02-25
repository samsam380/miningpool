FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build

ARG MININGCORE_REPO=https://github.com/coinfoundry/miningcore.git
ARG MININGCORE_REF=master

RUN apt-get update && apt-get install -y --no-install-recommends \
    git \
    build-essential \
    cmake \
    clang \
    pkg-config \
    libssl-dev \
    libzmq3-dev \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /src
RUN git clone --branch ${MININGCORE_REF} ${MININGCORE_REPO} miningcore
WORKDIR /src/miningcore
RUN dotnet publish -c Release -o /app/out src/Miningcore/Miningcore.csproj

FROM mcr.microsoft.com/dotnet/runtime:8.0
RUN apt-get update && apt-get install -y --no-install-recommends \
    libzmq5 \
    ca-certificates \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY --from=build /app/out/ ./
ENTRYPOINT ["dotnet", "Miningcore.dll"]
CMD ["-c", "/app/config.json"]
