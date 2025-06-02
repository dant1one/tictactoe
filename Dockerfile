# Use OpenJDK 11 as base image
FROM openjdk:11-jre-slim

# Set working directory
WORKDIR /app

# Copy the JAR file
COPY target/tictactoewebsocket-0.0.1-SNAPSHOT.jar app.jar

# Create data directory for H2 database
RUN mkdir -p /app/data

# Expose port
EXPOSE 8080

# Set active profile to GCP
ENV SPRING_PROFILES_ACTIVE=gcp

# Run the application
ENTRYPOINT ["java", "-jar", "app.jar", "--server.port=${PORT}"]
