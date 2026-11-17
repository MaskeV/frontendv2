import { ComponentFixture, TestBed } from '@angular/core/testing';
import { OracleServiceComponent } from './oracle-service.component';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('OracleServiceComponent', () => {
  let component: OracleServiceComponent;
  let fixture: ComponentFixture<OracleServiceComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [OracleServiceComponent, HttpClientTestingModule],
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
      ]
    })
      .compileComponents();

    fixture = TestBed.createComponent(OracleServiceComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
