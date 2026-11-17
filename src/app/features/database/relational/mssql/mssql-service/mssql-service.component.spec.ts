import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MssqlServiceComponent } from './mssql-service.component';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('MssqlServiceComponent', () => {
  let component: MssqlServiceComponent;
  let fixture: ComponentFixture<MssqlServiceComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MssqlServiceComponent, HttpClientTestingModule],
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

    fixture = TestBed.createComponent(MssqlServiceComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
