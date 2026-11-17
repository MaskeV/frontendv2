import { ComponentFixture, TestBed } from '@angular/core/testing';

import { NetworkDataComponent } from './network-data.component';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('NetworkDataComponent', () => {
  let component: NetworkDataComponent;
  let fixture: ComponentFixture<NetworkDataComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NetworkDataComponent, HttpClientTestingModule],
      providers: [
        {
          provide: ActivatedRoute,
          useValue: {
            // Mock the data, whatever the component expects from ActivatedRoute
            params: of({ id: '123' }),
            queryParams: of({}),
            snapshot: { data: {} }
          }
        }
      ],
    })
      .compileComponents();

    fixture = TestBed.createComponent(NetworkDataComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
