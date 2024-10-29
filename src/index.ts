import express from 'express';
import { Queue, Worker } from 'bullmq';
import ms from 'ms';
import IORedis from 'ioredis';
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient();
const app = express();
const redisConnection = new IORedis();
const predictionQueue = new Queue('predictions', { connection: redisConnection });

app.post('/predictions/create', async (req, res) => {
    const { predictionId, options, expiresIn } = req.body;

    try {
        const prediction = await prisma.prediction.create({
            data: {
                predictionId,
                expiresAt: new Date(Date.now() + ms(expiresIn)),
                options: {
                    create: options.map(option => ({
                        name: option
                    }))
                }
            }
        });

        await predictionQueue.add('closePrediction', { predictionId }, { delay: ms(expiresIn) });
        res.status(201).json({ message: 'Predicción creada con éxito.', prediction });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error al crear la predicción.' });
    }
});

app.post('/predictions/bet', async (req, res) => {
    const { predictionId, userId, optionId, pointsBet } = req.body;

    try {
        const prediction = await prisma.prediction.findUnique({
            where: { predictionId },
            include: { options: true }
        });

        if (!prediction || prediction.closed) {
            return res.status(400).json({ error: 'Predicción no encontrada o está cerrada.' });
        }

        const user = await prisma.user.findUnique({
            where: { id: userId }
        });

        if (!user || user.points < pointsBet) {
            return res.status(400).json({ error: 'No tienes suficientes puntos.' });
        }

        await prisma.user.update({
            where: { id: userId },
            data: {
                points: user.points - pointsBet
            }
        });

        await prisma.bet.create({
            data: {
                pointsBet,
                userId,
                optionId
            }
        });

        await prisma.option.update({
            where: { id: optionId },
            data: {
                totalPoints: {
                    increment: pointsBet
                }
            }
        });

        res.status(200).json({ message: 'Apuesta registrada.' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error al registrar la apuesta.' });
    }
});

// Worker para cerrar predicciones
const worker = new Worker('predictions', async (job) => {
    if (job.name === 'closePrediction') {
        const { predictionId } = job.data;

        try {
            const prediction = await prisma.prediction.findUnique({
                where: { predictionId },
                include: { options: { include: { bets: true } } }
            });

            if (!prediction || prediction.closed) {
                console.log(`La predicción ${predictionId} ya está cerrada o no existe.`);
                return;
            }

            await prisma.prediction.update({
                where: { predictionId },
                data: {
                    closed: true
                }
            });

            console.log(`La predicción ${predictionId} ha sido cerrada automáticamente.`);
        } catch (error) {
            console.error(`Error al cerrar la predicción ${predictionId}:`, error);
        }
    }
}, { connection: redisConnection });

app.get('/points/:userId', async (req, res) => {
    const { userId } = req.params;

    try {
        const user = await prisma.user.findUnique({
            where: { id: parseInt(userId, 10) }
        });

        res.json({ userId, points: user.points });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error al obtener los puntos del usuario.' });
    }
});

app.listen(3000, () => {
    console.log('Microservicio de predicciones corriendo en el puerto 3000');
});