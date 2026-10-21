#include <CoreFoundation/CoreFoundation.h>
#include <IOKit/IOKitLib.h>
#include <IOKit/usb/IOUSBLib.h>
#include <IOKit/IOCFPlugIn.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <unistd.h>

int main(int argc, char *argv[]) {
    CFMutableDictionaryRef matchingDict = IOServiceMatching("IOUSBHostInterface");
    if (!matchingDict) {
        matchingDict = IOServiceMatching("IOUSBInterface");
    }
    
    io_iterator_t iter;
    kern_return_t kr = IOServiceGetMatchingServices(kIOMainPortDefault, matchingDict, &iter);
    if (kr != KERN_SUCCESS) {
        printf("Failed to get matching services: 0x%08x\n", kr);
        return 1;
    }
    
    io_service_t interfaceService;
    int found = 0;
    
    while ((interfaceService = IOIteratorNext(iter))) {
        CFNumberRef classNum = (CFNumberRef)IORegistryEntryCreateCFProperty(interfaceService, CFSTR("bInterfaceClass"), kCFAllocatorDefault, 0);
        int ifClass = 0;
        if (classNum) {
            CFNumberGetValue(classNum, kCFNumberIntType, &ifClass);
            CFRelease(classNum);
        }
        
        CFStringRef prodName = (CFStringRef)IORegistryEntryCreateCFProperty(interfaceService, CFSTR("USB Product Name"), kCFAllocatorDefault, 0);
        char prodBuf[128] = {0};
        if (prodName) {
            CFStringGetCString(prodName, prodBuf, sizeof(prodBuf), kCFStringEncodingUTF8);
            CFRelease(prodName);
        }
        
        printf("Found USB Interface: class=%d, product='%s'\n", ifClass, prodBuf);
        
        if (ifClass == 7 || strstr(prodBuf, "Printe") || strstr(prodBuf, "Print")) {
            printf(">>> Matched Printer Interface: %s\n", prodBuf);
            found = 1;
            
            // Reset parent USB device to clear any controller hang
            io_service_t deviceService;
            if (IORegistryEntryGetParentEntry(interfaceService, kIOServicePlane, &deviceService) == KERN_SUCCESS) {
                IOCFPlugInInterface **devPlugIn = NULL;
                SInt32 devScore;
                if (IOCreatePlugInInterfaceForService(deviceService, kIOUSBDeviceUserClientTypeID, kIOCFPlugInInterfaceID, &devPlugIn, &devScore) == KERN_SUCCESS && devPlugIn) {
                    IOUSBDeviceInterface197 **devIntf = NULL;
                    if ((*devPlugIn)->QueryInterface(devPlugIn, CFUUIDGetUUIDBytes(kIOUSBDeviceInterfaceID197), (LPVOID*)&devIntf) == S_OK && devIntf) {
                        kr = (*devIntf)->ResetDevice(devIntf);
                        printf("ResetDevice result: 0x%08x\n", kr);
                        (*devIntf)->Release(devIntf);
                    }
                    (*devPlugIn)->Release(devPlugIn);
                }
                IOObjectRelease(deviceService);
                usleep(500000); // Wait 500ms after reset
            }

            IOCFPlugInInterface **plugInInterface = NULL;
            SInt32 score;
            kr = IOCreatePlugInInterfaceForService(interfaceService, kIOUSBInterfaceUserClientTypeID, kIOCFPlugInInterfaceID, &plugInInterface, &score);
            if (kr != KERN_SUCCESS || !plugInInterface) {
                printf("Failed IOCreatePlugInInterfaceForService: 0x%08x\n", kr);
                IOObjectRelease(interfaceService);
                continue;
            }
            
            IOUSBInterfaceInterface190 **intf = NULL;
            HRESULT hr = (*plugInInterface)->QueryInterface(plugInInterface, CFUUIDGetUUIDBytes(kIOUSBInterfaceInterfaceID190), (LPVOID*)&intf);
            (*plugInInterface)->Release(plugInInterface);
            if (hr || !intf) {
                printf("Failed QueryInterface: 0x%08x\n", hr);
                IOObjectRelease(interfaceService);
                continue;
            }
            
            kr = (*intf)->USBInterfaceOpen(intf);
            if (kr != KERN_SUCCESS) {
                printf("USBInterfaceOpen failed: 0x%08x\n", kr);
                (*intf)->Release(intf);
                IOObjectRelease(interfaceService);
                continue;
            }
            printf("Successfully OPENED USB Printer Interface!\n");
            
            UInt8 numEndpoints = 0;
            (*intf)->GetNumEndpoints(intf, &numEndpoints);
            printf("Num endpoints: %d\n", numEndpoints);
            
            UInt8 outPipe = 0;
            for (UInt8 i = 1; i <= numEndpoints; i++) {
                UInt8 direction, number, transferType, interval;
                UInt16 maxPacketSize;
                kr = (*intf)->GetPipeProperties(intf, i, &direction, &number, &transferType, &maxPacketSize, &interval);
                if (kr == KERN_SUCCESS) {
                    printf("Pipe %d: dir=%d, num=%d, type=%d, maxPacket=%d\n", i, direction, number, transferType, maxPacketSize);
                    if (direction == kUSBOut && transferType == kUSBBulk) {
                        outPipe = i;
                        printf("Found Bulk OUT pipe index: %d\n", outPipe);
                    }
                }
            }
            
            int success = 0;
            if (argc > 1) {
                FILE *f = fopen(argv[1], "rb");
                if (f) {
                    fseek(f, 0, SEEK_END);
                    long sz = ftell(f);
                    fseek(f, 0, SEEK_SET);
                    char *buf = malloc(sz);
                    fread(buf, 1, sz, f);
                    fclose(f);
                    kr = (*intf)->WritePipe(intf, 2, buf, sz);
                    free(buf);
                    printf("WritePipe file %s (%ld bytes): 0x%08x\n", argv[1], sz, kr);
                    if (kr == KERN_SUCCESS) success = 1;
                }
            } else {
                char data[] = "\x1b\x40\x1b\x61\x01\x1d\x21\x11" "EZYDINE POS\x1d\x21\x00\n--------------------------------\nDirect USB Print: OK!\nTime: Now\n--------------------------------\n\n\n\n\x1d\x56\x00";
                kr = (*intf)->WritePipe(intf, 2, data, strlen(data));
                printf("WritePipe test string: 0x%08x\n", kr);
                if (kr == KERN_SUCCESS) success = 1;
            }
            
            (*intf)->USBInterfaceClose(intf);
            (*intf)->Release(intf);
            IOObjectRelease(interfaceService);
            IOObjectRelease(iter);
            if (success) {
                printf("PRINT_SUCCESS\n");
                return 0;
            } else {
                printf("PRINT_FAILED (0x%08x)\n", kr);
                return 1;
            }
        }
        IOObjectRelease(interfaceService);
    }
    
    IOObjectRelease(iter);
    if (!found) {
        printf("No USB printer interface found.\n");
        return 1;
    }
    return 0;
}
