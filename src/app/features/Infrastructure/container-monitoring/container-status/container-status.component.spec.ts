import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ContainerStatusComponent } from './container-status.component';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('ContainerStatusComponent', () => {
  let component: ContainerStatusComponent;
  let fixture: ComponentFixture<ContainerStatusComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ContainerStatusComponent, HttpClientTestingModule],
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

    fixture = TestBed.createComponent(ContainerStatusComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
