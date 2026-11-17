import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MssqlInstanceComponent } from './mssql-instance.component';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('MssqlInstanceComponent', () => {
  let component: MssqlInstanceComponent;
  let fixture: ComponentFixture<MssqlInstanceComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MssqlInstanceComponent, HttpClientTestingModule],
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

    fixture = TestBed.createComponent(MssqlInstanceComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
