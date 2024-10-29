# **Sistema de Predicciones - Documentación**

Este proyecto implementa un sistema de predicciones similar al de **Twitch**, donde los usuarios pueden apostar puntos a distintas opciones en una predicción. Utiliza **Node.js**, **Prisma ORM**, **PostgreSQL**, **Redis**, **BullMQ** para tareas en segundo plano, y **Docker Compose** para la gestión de servicios.

---

## **Tabla de Contenidos**
1. [Descripción del Proyecto](#descripción-del-proyecto)
2. [Requisitos](#requisitos)
3. [Instalación](#instalación)
4. [Configuración](#configuración)
5. [Comandos Disponibles](#comandos-disponibles)
6. [Rutas API](#rutas-api)
7. [Ejecución](#ejecución)
8. [Licencia](#licencia)

---

## **Descripción del Proyecto**

Este sistema de predicciones permite:
- Crear predicciones con opciones de apuesta.
- Establecer tiempos de expiración para predicciones (usando `BullMQ`).
- Registrar apuestas de usuarios.
- Cerrar automáticamente las predicciones al expirar.
- Gestionar puntos de los usuarios.
  
Cada predicción tiene dos o más opciones, y los puntos apostados se distribuyen entre los ganadores proporcionalmente al monto de su apuesta.

---

## **Requisitos**

Asegúrate de tener instalado:
- **Docker**: [Descargar Docker](https://docs.docker.com/get-docker/)
- **Docker Compose**: Incluido en la instalación de Docker.

Opcional:
- **Postman** o cualquier cliente API para probar las rutas.

---

## **Instalación**

1. **Clona este repositorio**:
   ```bash
   git clone https://github.com/tu_usuario/prediction-system.git
   cd prediction-system
   ```

2. **Configura el entorno**:
   - Crea un archivo `.env` en la raíz del proyecto con la siguiente configuración:

     ```env
     DATABASE_URL="postgresql://postgres:postgres@postgres:5432/prediction_db"
     ```

3. **Construye y levanta los servicios** usando **Docker Compose**:
   ```bash
   docker-compose up --build
   ```

---

## **Configuración**

El proyecto incluye los siguientes servicios en `docker-compose.yml`:

- **Microservicio (Node.js)** en el puerto `3000`.
- **PostgreSQL** como base de datos para almacenar usuarios, predicciones y apuestas.
- **Redis** para manejar las tareas en segundo plano.

---

## **Comandos Disponibles**

### **Para levantar los contenedores:**
```bash
docker-compose up --build
```

### **Para detener los contenedores:**
```bash
docker-compose down
```

### **Acceder a la base de datos PostgreSQL:**
```bash
docker exec -it <postgres_container_id> psql -U postgres -d prediction_db
```

### **Ver registros en Redis (opcional):**
```bash
docker exec -it <redis_container_id> redis-cli
```

### **Generar cliente Prisma (en caso de cambios en el esquema):**
```bash
npx prisma generate
```

### **Aplicar migraciones de Prisma:**
```bash
npx prisma migrate dev --name init
```

---

## **Rutas API**

### **1. Crear una predicción**
- **Ruta**: `POST /predictions/create`
- **Descripción**: Crea una nueva predicción con opciones de apuesta y duración.
- **Cuerpo de la solicitud**:
  ```json
  {
    "predictionId": "match1",
    "options": ["Equipo A", "Equipo B"],
    "expiresIn": "5m"
  }
  ```
- **Respuesta**:
  ```json
  {
    "message": "Predicción creada con éxito.",
    "prediction": { ... }
  }
  ```

### **2. Hacer una apuesta**
- **Ruta**: `POST /predictions/bet`
- **Descripción**: Registra una apuesta de un usuario.
- **Cuerpo de la solicitud**:
  ```json
  {
    "predictionId": "match1",
    "userId": 1,
    "optionId": 2,
    "pointsBet": 100
  }
  ```
- **Respuesta**:
  ```json
  {
    "message": "Apuesta registrada."
  }
  ```

### **3. Consultar puntos de usuario**
- **Ruta**: `GET /points/:userId`
- **Descripción**: Consulta los puntos actuales de un usuario.
- **Ejemplo de llamada**:
  ```bash
  GET /points/1
  ```
- **Respuesta**:
  ```json
  {
    "userId": 1,
    "points": 900
  }
  ```

### **4. Cierre automático de predicciones**
No es necesaria una ruta específica para el cierre de predicciones. BullMQ gestionará el cierre automáticamente después del tiempo definido en `expiresIn`.

---

## **Ejecución**

1. **Iniciar los servicios**:
   ```bash
   docker-compose up --build
   ```

2. **Probar la API** usando **Postman** o cualquier cliente API.

3. **Verificar el cierre automático**:
   - Crea una predicción con una duración corta (`1m`, por ejemplo).
   - Observa en los logs del contenedor cómo BullMQ cierra la predicción automáticamente.
