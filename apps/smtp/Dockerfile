# Use the Bun image as the base image
FROM oven/bun:latest

# Set the working directory in the container
WORKDIR /app

# Copy the current directory contents into the container at /app
COPY . .

# Install dependencies
RUN bun install

# Expose the port on which the API will listen
EXPOSE 25

# Run the server when the container launches
CMD ["bun", "run", "index.ts"]