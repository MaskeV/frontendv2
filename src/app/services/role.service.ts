import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import { Product, FeatureComponent, PRODUCTS, FEATURES } from '../models/Role';

@Injectable({
    providedIn: 'root'
})
export class RoleService {
    private http = inject(HttpClient);

    private baseUrl = environment.baseUrl;

    // private baseUrl = 'http://localhost:12003';

    constructor() { }

    findProducts(userId: string, userType: string): Observable<{ products: Product[], features: FeatureComponent[] }> {
        // Retrieve tool directly from session storage; fallback to 'ORC' or 'APM'
        let currentTool = 'ORC';
        if (typeof window !== 'undefined' && sessionStorage.getItem('tool')) {
            currentTool = sessionStorage.getItem('tool') as string;
        }

        const params = new HttpParams()
            .set('userId', userId)
            .set('userType', userType)
            .set('tool', currentTool);

        return this.http.get<any>(`${this.baseUrl}/role/api/findProducts`, { params }).pipe(
            map(response => {
                const mappedProducts: Product[] = [];
                const mappedFeatures: FeatureComponent[] = [];

                if (response.products) {
                    response.products.forEach((p: string) => {
                        const mapped = this.mapProduct(p);
                        if (mapped) mappedProducts.push(mapped);
                    });
                }

                if (response.features) {
                    response.features.forEach((f: string) => {
                        const mapped = this.mapFeature(f);
                        if (mapped) mappedFeatures.push(mapped);
                    });
                }

                // Filter duplicates
                const uniqueProducts = Array.from(new Set(mappedProducts));
                const uniqueFeatures = Array.from(new Set(mappedFeatures));

                return { products: uniqueProducts, features: uniqueFeatures };
            })
        );
    }


    private mapProduct(backendName: string): Product | null {
        // Normalize: trimmed
        const normalized = backendName ? backendName.trim() : '';
        if (!normalized) return null;

        // Return exactly what the backend sends.
        // We cast to Product because the UI relies on these strings directly.
        return normalized as Product;
    }

    private mapFeature(backendName: string): FeatureComponent | null {
        const normalized = backendName ? backendName.trim() : '';
        if (!normalized) return null;

        // Return exactly what the backend sends.
        return normalized as FeatureComponent;
    }

    deleteRoleById(roleId: number): Observable<any> {
        return this.http.delete<any>(`${this.baseUrl}/role/api/deleteRoleById/${roleId}`);
    }

    findAppType(userId: string, userType: string, tool: string): Observable<{ products: Product[], features: FeatureComponent[] }> {
        const params = new HttpParams()
            .set('userId', userId)
            .set('userType', userType)
            .set('tool', tool);

        return this.http.get<any>(`${this.baseUrl}/role/api/findProducts`, { params })
    }
}
