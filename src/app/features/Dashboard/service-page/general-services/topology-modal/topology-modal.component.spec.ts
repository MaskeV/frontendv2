import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TopologyModalComponent } from './topology-modal.component';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';

describe('TopologyModalComponent', () => {
  let component: TopologyModalComponent;
  let fixture: ComponentFixture<TopologyModalComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TopologyModalComponent, HttpClientTestingModule],
      providers: [
        {
          provide: NgbActiveModal,
          useValue: {
            close: jest.fn(),
            dismiss: jest.fn()
          }
        }
      ]

    })
      .compileComponents();

    fixture = TestBed.createComponent(TopologyModalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
