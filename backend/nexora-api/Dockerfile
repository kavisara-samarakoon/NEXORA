FROM maven:3.9.12-eclipse-temurin-17 AS build
WORKDIR /build
COPY pom.xml .
COPY src/main ./src/main
RUN mvn --batch-mode --no-transfer-progress -DskipTests package

FROM eclipse-temurin:17-jre-jammy
WORKDIR /app
COPY --from=build --chown=10001:10001 /build/target/nexora-api-0.0.1-SNAPSHOT.jar /app/nexora-api.jar
USER 10001:10001
# This image fails closed without the hosted database, secrets, origins and PORT.
ENV SPRING_PROFILES_ACTIVE=hosted-demo
EXPOSE 10000
CMD ["java", "-XX:MaxRAMPercentage=60.0", "-jar", "/app/nexora-api.jar"]
