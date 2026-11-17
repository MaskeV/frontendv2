import { Injectable } from '@angular/core';
import { environment } from '../../environments/environment';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
    providedIn: 'root'
})
export class ActivemqService {

    private baseUrl = environment.baseUrl;

    // private baseUrl = "http://localhost:12033";

    constructor(private http: HttpClient) { }

    public getServiceNames(): Observable<any> {
        return this.http.get(`${this.baseUrl}/activemq/api/overview/serviceNames`);
    }

    public getSystemLoadAverage(entityId: string, st: any, et: any): Observable<any> {
        const params = new HttpParams()
            .set("entityId", entityId)
            .set("st", st)
            .set("et", et);

        return this.http.get<any>(
            `${this.baseUrl}/activemq/api/overview/loadAverage`,
            { params }
        );
    }

    public getThreadCount(entityId: string, st: any, et: any): Observable<any> {
        const params = new HttpParams()
            .set("entityId", entityId)
            .set("st", st)
            .set("et", et);

        return this.http.get<any>(
            `${this.baseUrl}/activemq/api/overview/threadCount`,
            { params }
        );
    }

    public getHeapMemoryUsage(entityId: string, st: any, et: any): Observable<any> {
        const params = new HttpParams()
            .set("entityId", entityId)
            .set("st", st)
            .set("et", et);

        return this.http.get<any>(
            `${this.baseUrl}/activemq/api/overview/heapMemoryUsage`,
            { params }
        );
    }

    public getAverageEnqueue(entityId: string, st: any, et: any): Observable<any> {
        const params = new HttpParams()
            .set("entityId", entityId)
            .set("st", st)
            .set("et", et);

        return this.http.get<any>(
            `${this.baseUrl}/activemq/api/overview/averageEnqueue`,
            { params }
        );
    }

    public getMaxEnqueue(entityId: string, st: any, et: any): Observable<any> {
        const params = new HttpParams()
            .set("entityId", entityId)
            .set("st", st)
            .set("et", et);

        return this.http.get<any>(
            `${this.baseUrl}/activemq/api/overview/maxEnqueue`,
            { params }
        );
    }

    public getGcYoungCollectionCount(entityId: string, st: any, et: any): Observable<any> {
        const params = new HttpParams()
            .set("entityId", entityId)
            .set("st", st)
            .set("et", et);

        return this.http.get<any>(
            `${this.baseUrl}/activemq/api/overview/gcYoungCollectionCount`,
            { params }
        );
    }

    public getGcOldCollectionCount(entityId: string, st: any, et: any): Observable<any> {
        const params = new HttpParams()
            .set("entityId", entityId)
            .set("st", st)
            .set("et", et);

        return this.http.get<any>(
            `${this.baseUrl}/activemq/api/overview/gcOldCollectionCount`,
            { params }
        );
    }

    public getGcYoungCollectionTime(entityId: string, st: any, et: any): Observable<any> {
        const params = new HttpParams()
            .set("entityId", entityId)
            .set("st", st)
            .set("et", et);

        return this.http.get<any>(
            `${this.baseUrl}/activemq/api/overview/gcYoungCollectionTime`,
            { params }
        );
    }

    public getGcOldCollectionTime(entityId: string, st: any, et: any): Observable<any> {
        const params = new HttpParams()
            .set("entityId", entityId)
            .set("st", st)
            .set("et", et);

        return this.http.get<any>(
            `${this.baseUrl}/activemq/api/overview/gcOldCollectionTime`,
            { params }
        );
    }

    public getEnqueueCountPerSecond(entityId: string, st: any, et: any): Observable<any> {
        const params = new HttpParams()
            .set("entityId", entityId)
            .set("st", st)
            .set("et", et);

        return this.http.get<any>(
            `${this.baseUrl}/activemq/api/overview/enqueue`,
            { params }
        );
    }

    public getDequeueCountPerSecond(entityId: string, st: any, et: any): Observable<any> {
        const params = new HttpParams()
            .set("entityId", entityId)
            .set("st", st)
            .set("et", et);

        return this.http.get<any>(
            `${this.baseUrl}/activemq/api/overview/dequeue`,
            { params }
        );
    }

    public getDispatchPerSecond(entityId: string, st: any, et: any): Observable<any> {
        const params = new HttpParams()
            .set("entityId", entityId)
            .set("st", st)
            .set("et", et);

        return this.http.get<any>(
            `${this.baseUrl}/activemq/api/overview/dispatch`,
            { params }
        );
    }

    public getExpirePerSecond(entityId: string, st: any, et: any): Observable<any> {
        const params = new HttpParams()
            .set("entityId", entityId)
            .set("st", st)
            .set("et", et);

        return this.http.get<any>(
            `${this.baseUrl}/activemq/api/overview/expire`,
            { params }
        );
    }

    public getHeapMemoryInit(entityId: string, st: any, et: any): Observable<any> {
        const params = new HttpParams()
            .set("entityId", entityId)
            .set("st", st)
            .set("et", et);

        return this.http.get<any>(
            `${this.baseUrl}/activemq/api/overview/heapMemoryInit`,
            { params }
        );
    }

    public getHeapMemoryCommitted(entityId: string, st: any, et: any): Observable<any> {
        const params = new HttpParams()
            .set("entityId", entityId)
            .set("st", st)
            .set("et", et);

        return this.http.get<any>(
            `${this.baseUrl}/activemq/api/overview/heapMemoryCommitted`,
            { params }
        );
    }

    public getHeapMemoryMax(entityId: string, st: any, et: any): Observable<any> {
        const params = new HttpParams()
            .set("entityId", entityId)
            .set("st", st)
            .set("et", et);

        return this.http.get<any>(
            `${this.baseUrl}/activemq/api/overview/heapMemoryMax`,
            { params }
        );
    }

    public getBrokerNames(entityId: string, st: any, et: any): Observable<any> {
        const params = new HttpParams()
            .set("entityId", entityId)
            .set("st", st)
            .set("et", et);

        return this.http.get<any>(
            `${this.baseUrl}/activemq/api/broker/names`,
            { params }
        );
    }

    // Broker Page APIs
    public getBrokerUptime(entityId: string, st: any, et: any): Observable<any> {
        const params = new HttpParams()
            .set("entityId", entityId)
            .set("st", st)
            .set("et", et);

        return this.http.get<any>(
            `${this.baseUrl}/activemq/api/broker/uptime`,
            { params }
        );
    }

    public getBrokerSlave(entityId: string, st: any, et: any): Observable<any> {
        const params = new HttpParams()
            .set("entityId", entityId)
            .set("st", st)
            .set("et", et);

        return this.http.get<any>(
            `${this.baseUrl}/activemq/api/broker/state`,
            { params }
        );
    }

    public getCurrentProducerCount(entityId: string, st: any, et: any): Observable<any> {
        const params = new HttpParams()
            .set("entityId", entityId)
            .set("st", st)
            .set("et", et);

        return this.http.get<any>(
            `${this.baseUrl}/activemq/api/broker/currentProducerCount`,
            { params }
        );
    }

    public getCurrentConsumerCount(entityId: string, st: any, et: any): Observable<any> {
        const params = new HttpParams()
            .set("entityId", entityId)
            .set("st", st)
            .set("et", et);

        return this.http.get<any>(
            `${this.baseUrl}/activemq/api/broker/currentConsumerCount`,
            { params }
        );
    }

    public getBrokerConnections(entityId: string, st: any, et: any): Observable<any> {
        const params = new HttpParams()
            .set("entityId", entityId)
            .set("st", st)
            .set("et", et);

        return this.http.get<any>(
            `${this.baseUrl}/activemq/api/broker/connections`,
            { params }
        );
    }

    public getIncreasedProducerCount(entityId: string, st: any, et: any): Observable<any> {
        const params = new HttpParams()
            .set("entityId", entityId)
            .set("st", st)
            .set("et", et);

        return this.http.get<any>(
            `${this.baseUrl}/activemq/api/broker/increasedProducerCount`,
            { params }
        );
    }

    public getIncreasedConsumerCount(entityId: string, st: any, et: any): Observable<any> {
        const params = new HttpParams()
            .set("entityId", entityId)
            .set("st", st)
            .set("et", et);

        return this.http.get<any>(
            `${this.baseUrl}/activemq/api/broker/increasedConsumerCount`,
            { params }
        );
    }

    public getEnqueueDequeueCount(entityId: string, st: any, et: any): Observable<any> {
        const params = new HttpParams()
            .set("entityId", entityId)
            .set("st", st)
            .set("et", et);

        return this.http.get<any>(
            `${this.baseUrl}/activemq/api/broker/enqueueDequeueCount`,
            { params }
        );
    }

    public getEnqueueDequeueRate(entityId: string, st: any, et: any): Observable<any> {
        const params = new HttpParams()
            .set("entityId", entityId)
            .set("st", st)
            .set("et", et);

        return this.http.get<any>(
            `${this.baseUrl}/activemq/api/broker/enqueueDequeueRate`,
            { params }
        );
    }

    public getMemoryUsage(entityId: string, st: any, et: any): Observable<any> {
        const params = new HttpParams()
            .set("entityId", entityId)
            .set("st", st)
            .set("et", et);

        return this.http.get<any>(
            `${this.baseUrl}/activemq/api/broker/memoryUsage`,
            { params }
        );
    }

    public getUsageLimit(entityId: string, st: any, et: any): Observable<any> {
        const params = new HttpParams()
            .set("entityId", entityId)
            .set("st", st)
            .set("et", et);

        return this.http.get<any>(
            `${this.baseUrl}/activemq/api/broker/usageLimit`,
            { params }
        );
    }

    public getMessageSize(entityId: string, st: any, et: any): Observable<any> {
        const params = new HttpParams()
            .set("entityId", entityId)
            .set("st", st)
            .set("et", et);

        return this.http.get<any>(
            `${this.baseUrl}/activemq/api/broker/messageSize`,
            { params }
        );
    }

    // Destination Page APIs
    public getDestinationNames(entityId: string, st: any, et: any): Observable<any> {
        const params = new HttpParams()
            .set("entityId", entityId)
            .set("st", st)
            .set("et", et);

        return this.http.get<any>(
            `${this.baseUrl}/activemq/api/destination/names`,
            { params }
        );
    }

    public getDestinationProducerCount(entityId: string, st: any, et: any): Observable<any> {
        const params = new HttpParams()
            .set("entityId", entityId)
            .set("st", st)
            .set("et", et);

        return this.http.get<any>(
            `${this.baseUrl}/activemq/api/destination/producerCount`,
            { params }
        );
    }

    public getDestinationConsumerCount(entityId: string, st: any, et: any): Observable<any> {
        const params = new HttpParams()
            .set("entityId", entityId)
            .set("st", st)
            .set("et", et);

        return this.http.get<any>(
            `${this.baseUrl}/activemq/api/destination/consumerCount`,
            { params }
        );
    }

    public getDestinationMemoryUsage(entityId: string, st: any, et: any): Observable<any> {
        const params = new HttpParams()
            .set("entityId", entityId)
            .set("st", st)
            .set("et", et);

        return this.http.get<any>(
            `${this.baseUrl}/activemq/api/destination/memoryUsage`,
            { params }
        );
    }

    public getDestinationQueueSize(entityId: string, st: any, et: any): Observable<any> {
        const params = new HttpParams()
            .set("entityId", entityId)
            .set("st", st)
            .set("et", et);

        return this.http.get<any>(
            `${this.baseUrl}/activemq/api/destination/queueSize`,
            { params }
        );
    }

    public getDestinationMessageCount(entityId: string, st: any, et: any): Observable<any> {
        const params = new HttpParams()
            .set("entityId", entityId)
            .set("st", st)
            .set("et", et);

        return this.http.get<any>(
            `${this.baseUrl}/activemq/api/destination/messageCount`,
            { params }
        );
    }

    public getDestinationAvgEnqueueTime(entityId: string, st: any, et: any): Observable<any> {
        const params = new HttpParams()
            .set("entityId", entityId)
            .set("st", st)
            .set("et", et);

        return this.http.get<any>(
            `${this.baseUrl}/activemq/api/destination/avgEnqueueTime`,
            { params }
        );
    }

    public getDestinationMaxEnqueueTime(entityId: string, st: any, et: any): Observable<any> {
        const params = new HttpParams()
            .set("entityId", entityId)
            .set("st", st)
            .set("et", et);

        return this.http.get<any>(
            `${this.baseUrl}/activemq/api/destination/maxEnqueueTime`,
            { params }
        );
    }

}
